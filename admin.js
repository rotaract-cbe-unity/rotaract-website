/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - ADMIN PANEL
   Complete - All triggers, mails, CRUD, reports working
   File: admin.js
   ============================================================ */

'use strict';

// ============================================================
// ADMIN STATE
// ============================================================
var AdminState = {
    initialized: false,
    refreshTimer: null
};

// ============================================================
// INIT
// ============================================================
function initAdminModule() {
    if (AdminState.initialized) return;
    AdminState.initialized = true;
    console.log('%c admin.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');
}

// ============================================================
// SAFE DOM HELPERS
// ============================================================
function gv(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function gc(id) {
    var el = document.getElementById(id);
    return el ? el.checked : false;
}

function hasFullAccess() {
    if (!AppState.currentAdmin) return false;
    return ['super_admin', 'advisor', 'president', 'immediate_past_president'].indexOf(AppState.currentAdmin.role) !== -1;
}

// ============================================================
// AUTO REFRESH
// ============================================================
function startAdminAutoRefresh() {
    stopAdminAutoRefresh();
    AdminState.refreshTimer = setInterval(function() {
        if (AppState.currentAdminPage === 'dashboard' && AppState.currentAdmin) {
            loadAdminDashboard().catch(function(e) { console.warn('Auto-refresh error:', e); });
        }
        _updateAppBadge();
    }, 5 * 60 * 1000);
}

function stopAdminAutoRefresh() {
    if (AdminState.refreshTimer) { clearInterval(AdminState.refreshTimer); AdminState.refreshTimer = null; }
}

function _updateAppBadge() {
    if (!supabase || !AppState.currentAdmin) return;
    supabase.from('membership_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        .then(function(r) {
            var badge = document.getElementById('appBadge');
            if (!badge) return;
            var c = r.count || 0;
            badge.textContent = c;
            badge.style.display = c > 0 ? 'inline' : 'none';
        }).catch(function() {});
}

setInterval(function() { if (AppState.currentAdmin) _updateAppBadge(); }, 2 * 60 * 1000);

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================
async function loadAdminSettings() {
    if (!isSuperAdmin()) {
        var c = document.getElementById('settingsFormContainer');
        if (c) {
            c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-tertiary);"><i data-lucide="lock" style="width:46px;height:46px;display:block;margin:0 auto 12px;opacity:0.5;"></i><p style="font-size:1rem;font-weight:600;">Access Restricted</p><p style="font-size:0.85rem;">Only Super Admin can modify site settings</p></div>';
            refreshIcons();
        }
        return;
    }
    await loadSettings();
    showSettingsGroup('general');
}

function showSettingsGroup(group) {
    document.querySelectorAll('.settings-tab').forEach(function(t) {
        t.classList.toggle('active', (t.getAttribute('onclick') || '').indexOf("'" + group + "'") !== -1);
    });
    var c = document.getElementById('settingsFormContainer');
    if (!c) return;
    var gs = Object.values(AppState.settingsCache || {}).filter(function(s) { return s.setting_group === group; });
    if (!gs.length) { c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-tertiary);">No settings in this category</div>'; return; }
    c.innerHTML = gs.map(function(s) {
        var sk = escapeHtml(s.setting_key), sv = escapeHtml(s.setting_value || ''), ih = '';
        switch (s.setting_type) {
            case 'boolean':
                ih = '<label class="toggle-switch" style="margin-top:4px;"><input type="checkbox" ' + (s.setting_value === 'true' ? 'checked' : '') + ' onchange="saveSetting(\'' + sk + '\',this.checked?\'true\':\'false\')"><span class="toggle-slider"></span></label>';
                break;
            case 'html':
                ih = '<textarea rows="4" onchange="saveSetting(\'' + sk + '\',this.value)">' + sv + '</textarea>';
                break;
            case 'color':
                ih = '<div style="display:flex;gap:8px;align-items:center;"><input type="color" value="' + (s.setting_value || '#0057b7') + '" style="width:46px;height:34px;padding:2px;border-radius:4px;" onchange="saveSetting(\'' + sk + '\',this.value);this.nextElementSibling.value=this.value;"><input type="text" value="' + sv + '" placeholder="#000000" onchange="saveSetting(\'' + sk + '\',this.value);this.previousElementSibling.value=this.value;"></div>';
                break;
            case 'image':
                ih = '<input type="url" value="' + sv + '" placeholder="https://..." onchange="saveSetting(\'' + sk + '\',this.value)">';
                if (s.setting_value) ih += '<img src="' + sv + '" style="max-width:110px;max-height:55px;margin-top:8px;border-radius:4px;border:1px solid var(--border-color);" onerror="this.style.display=\'none\'">';
                break;
            default:
                var it = s.setting_type === 'number' ? 'number' : s.setting_type === 'email' ? 'email' : s.setting_type === 'url' ? 'url' : 'text';
                ih = '<input type="' + it + '" value="' + sv + '" placeholder="Enter ' + escapeHtml(s.setting_label || s.setting_key) + '" onchange="saveSetting(\'' + sk + '\',this.value)">';
        }
        return '<div class="setting-item"><label>' + escapeHtml(s.setting_label || s.setting_key) + '</label>' + ih + '<small>' + sk + '</small></div>';
    }).join('');
    refreshIcons();
}

async function saveSetting(key, value) {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    var ok = await updateSetting(key, value);
    if (ok) { showToast('success', 'Saved', escapeHtml(key) + ' updated'); applySettingsToPage(); initSocialLinks(); }
    else showToast('error', 'Failed', 'Could not save setting');
}

// ============================================================
// STATISTICS CRUD
// ============================================================
async function loadAdminStatistics() {
    try {
        if (!supabase) return;
        var r = await supabase.from('club_statistics').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.statistics = r.data || [];
        _renderStatsTable(AppState.statistics);
    } catch (err) { console.error('Statistics error:', err); showToast('error', 'Error', 'Failed to load statistics'); }
}

function _renderStatsTable(stats) {
    var tbody = document.getElementById('statisticsTableBody');
    if (!tbody) return;
    if (!stats || !stats.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary);">No statistics yet. Click Add.</td></tr>'; return; }
    tbody.innerHTML = stats.map(function(s) {
        return '<tr><td><i data-lucide="' + escapeHtml(s.stat_icon || 'bar-chart') + '" style="width:17px;height:17px;color:var(--primary);"></i></td><td><strong>' + escapeHtml(s.stat_label) + '</strong></td><td>' + escapeHtml(s.stat_value) + '</td><td><span class="badge ' + (s.is_visible ? 'badge-success' : 'badge-danger') + '">' + (s.is_visible ? 'Visible' : 'Hidden') + '</span></td><td><div class="table-actions"><button class="btn-icon" onclick="openStatForm(\'' + s.id + '\')"><i data-lucide="edit-2"></i></button><button class="btn-icon" onclick="deleteStat(\'' + s.id + '\')" style="color:var(--danger);"><i data-lucide="trash-2"></i></button></div></td></tr>';
    }).join('');
    refreshIcons();
}

function openStatForm(statId) {
    statId = statId || '';
    var ex = statId ? (AppState.statistics || []).find(function(s) { return s.id === statId; }) : null;
    var ie = !!ex;
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (ie ? 'edit-2' : 'plus') + '"></i>' + (ie ? 'Edit Statistic' : 'Add Statistic');
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveStat(event,\'' + statId + '\')">',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="tag"></i>Label *</label><input type="text" id="statLabel" required placeholder="e.g. Projects Completed" value="' + (ie ? escapeHtml(ex.stat_label) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="hash"></i>Value *</label><input type="text" id="statValue" required placeholder="e.g. 500" value="' + (ie ? escapeHtml(ex.stat_value) : '') + '"></div></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="image"></i>Icon Name</label><input type="text" id="statIcon" placeholder="e.g. briefcase, heart, users" value="' + (ie ? escapeHtml(ex.stat_icon || '') : '') + '"><small style="color:var(--text-tertiary);margin-top:3px;display:block;">Browse: lucide.dev/icons</small></div>',
            '<div class="form-group"><label><i data-lucide="sort-asc"></i>Sort Order</label><input type="number" id="statOrder" placeholder="0" value="' + (ie ? ex.sort_order : ((AppState.statistics || []).length + 1)) + '"></div></div>',
            '<div class="form-group" style="display:flex;align-items:center;gap:12px;margin-top:8px;"><label class="toggle-switch"><input type="checkbox" id="statVisible" ' + (!ie || ex.is_visible ? 'checked' : '') + '><span class="toggle-slider"></span></label><span style="font-size:0.85rem;font-weight:500;">Visible on website</span></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary"><i data-lucide="save"></i>' + (ie ? 'Update' : 'Add') + '</button></div></form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

async function saveStat(e, statId) {
    e.preventDefault();
    statId = statId || '';
    var ie = statId.length > 5;
    var label = gv('statLabel'), value = gv('statValue');
    if (!label || !value) { showToast('error', 'Required', 'Label and value are required'); return; }
    var data = { stat_label: label, stat_value: value, stat_icon: gv('statIcon') || 'bar-chart', sort_order: parseInt(gv('statOrder')) || 0, is_visible: gc('statVisible'), stat_key: slugify(label), updated_at: new Date().toISOString() };
    try {
        if (!supabase) throw new Error('DB not connected');
        var r = ie ? await supabase.from('club_statistics').update(data).eq('id', statId) : await supabase.from('club_statistics').insert(data);
        if (r.error) throw r.error;
        await logActivity(ie ? 'update_statistic' : 'create_statistic', 'club_statistics', statId || null, { label: label });
        closeModal('formModal'); showToast('success', 'Saved', 'Statistic ' + (ie ? 'updated' : 'added'));
        await loadAdminStatistics(); await loadPublicStatistics();
    } catch (err) { showToast('error', 'Error', err.message || 'Failed'); }
}

async function deleteStat(statId) {
    if (!statId || !(await confirmAction('Delete?', 'Remove this statistic?', 'Yes, Delete'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('club_statistics').delete().eq('id', statId);
        if (r.error) throw r.error;
        await logActivity('delete_statistic', 'club_statistics', statId, {});
        showToast('success', 'Deleted', 'Statistic removed'); await loadAdminStatistics(); await loadPublicStatistics();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// BENEFITS CRUD
// ============================================================
async function loadAdminBenefits() {
    try {
        if (!supabase) return;
        var r = await supabase.from('joining_benefits').select('*').order('sort_order', { ascending: true });
        if (r.error) throw r.error;
        AppState.benefits = r.data || [];
        _renderBenefitsTable(AppState.benefits);
    } catch (err) { console.error('Benefits error:', err); }
}

function _renderBenefitsTable(benefits) {
    var tbody = document.getElementById('benefitsTableBody');
    if (!tbody) return;
    if (!benefits || !benefits.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary);">No benefits yet. Click Add.</td></tr>'; return; }
    tbody.innerHTML = benefits.map(function(b) {
        return '<tr><td><i data-lucide="' + escapeHtml(b.icon || 'star') + '" style="width:17px;height:17px;color:var(--primary);"></i></td><td><strong>' + escapeHtml(b.title) + '</strong></td><td style="max-width:280px;white-space:normal;font-size:0.78rem;">' + escapeHtml(truncateText(b.description, 80)) + '</td><td><span class="badge ' + (b.is_visible ? 'badge-success' : 'badge-danger') + '">' + (b.is_visible ? 'Visible' : 'Hidden') + '</span></td><td><div class="table-actions"><button class="btn-icon" onclick="openBenefitForm(\'' + b.id + '\')"><i data-lucide="edit-2"></i></button><button class="btn-icon" onclick="deleteBenefit(\'' + b.id + '\')" style="color:var(--danger);"><i data-lucide="trash-2"></i></button></div></td></tr>';
    }).join('');
    refreshIcons();
}

function openBenefitForm(benefitId) {
    benefitId = benefitId || '';
    var ex = benefitId ? (AppState.benefits || []).find(function(b) { return b.id === benefitId; }) : null;
    var ie = !!ex;
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (ie ? 'edit-2' : 'plus') + '"></i>' + (ie ? 'Edit Benefit' : 'Add Benefit');
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="saveBenefit(event,\'' + benefitId + '\')">',
            '<div class="form-group"><label><i data-lucide="tag"></i>Title *</label><input type="text" id="benTitle" required placeholder="e.g. Leadership Development" value="' + (ie ? escapeHtml(ex.title) : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="file-text"></i>Description *</label><textarea id="benDesc" rows="4" required placeholder="Describe this benefit...">' + (ie ? escapeHtml(ex.description) : '') + '</textarea></div>',
            '<div class="form-row"><div class="form-group"><label><i data-lucide="image"></i>Icon Name</label><input type="text" id="benIcon" placeholder="e.g. compass, heart" value="' + (ie ? escapeHtml(ex.icon || '') : '') + '"></div>',
            '<div class="form-group"><label><i data-lucide="sort-asc"></i>Sort Order</label><input type="number" id="benOrder" placeholder="0" value="' + (ie ? ex.sort_order : ((AppState.benefits || []).length + 1)) + '"></div></div>',
            '<div class="form-group" style="display:flex;align-items:center;gap:12px;margin-top:8px;"><label class="toggle-switch"><input type="checkbox" id="benVisible" ' + (!ie || ex.is_visible ? 'checked' : '') + '><span class="toggle-slider"></span></label><span style="font-size:0.85rem;font-weight:500;">Visible on website</span></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary"><i data-lucide="save"></i>' + (ie ? 'Update' : 'Add') + '</button></div></form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

async function saveBenefit(e, benefitId) {
    e.preventDefault();
    benefitId = benefitId || '';
    var ie = benefitId.length > 5;
    var title = gv('benTitle'), desc = gv('benDesc');
    if (!title || !desc) { showToast('error', 'Required', 'Title and description are required'); return; }
    var data = { title: title, description: desc, icon: gv('benIcon') || 'star', sort_order: parseInt(gv('benOrder')) || 0, is_visible: gc('benVisible') };
    try {
        if (!supabase) throw new Error('DB not connected');
        var r = ie ? await supabase.from('joining_benefits').update(data).eq('id', benefitId) : await supabase.from('joining_benefits').insert(data);
        if (r.error) throw r.error;
        await logActivity(ie ? 'update_benefit' : 'create_benefit', 'joining_benefits', benefitId || null, { title: title });
        closeModal('formModal'); showToast('success', 'Saved', 'Benefit ' + (ie ? 'updated' : 'added'));
        await loadAdminBenefits(); await loadPublicBenefits();
    } catch (err) { showToast('error', 'Error', err.message || 'Failed'); }
}

async function deleteBenefit(benefitId) {
    if (!benefitId || !(await confirmAction('Delete?', 'Remove this benefit?', 'Yes, Delete'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('joining_benefits').delete().eq('id', benefitId);
        if (r.error) throw r.error;
        await logActivity('delete_benefit', 'joining_benefits', benefitId, {});
        showToast('success', 'Deleted', 'Benefit removed'); await loadAdminBenefits(); await loadPublicBenefits();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// ACTIVITY LOG
// ============================================================
async function loadActivityLog() {
    var tbody = document.getElementById('activityTableBody');
    if (!tbody) return;
    try {
        if (!supabase) return;
        var lr = await supabase.from('activity_log').select('id,action,entity_type,entity_id,details,admin_id,created_at').order('created_at', { ascending: false }).limit(100);
        if (lr.error) throw lr.error;
        var logs = lr.data || [];
        var ids = []; logs.forEach(function(l) { if (l.admin_id && ids.indexOf(l.admin_id) === -1) ids.push(l.admin_id); });
        var map = {};
        if (ids.length > 0) {
            var ar = await supabase.from('admin_users').select('id,full_name,role').in('id', ids);
            if (!ar.error && ar.data) ar.data.forEach(function(a) { map[a.id] = a; });
        }
        if (!logs.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary);">No activity recorded yet</td></tr>'; return; }
        tbody.innerHTML = logs.map(function(log) {
            var admin = log.admin_id ? map[log.admin_id] : null;
            var det = '-'; if (log.details) { try { det = JSON.stringify(log.details).substring(0, 70); } catch (e) {} }
            return '<tr><td style="white-space:nowrap;font-size:0.78rem;">' + formatTimestamp(log.created_at) + '</td><td><div style="font-weight:700;font-size:0.82rem;">' + escapeHtml(admin ? admin.full_name : 'System') + '</div><div style="font-size:0.7rem;color:var(--text-tertiary);">' + formatRoleLabel(admin ? admin.role : '') + '</div></td><td><span class="badge badge-primary">' + escapeHtml((log.action || '').replace(/_/g, ' ')) + '</span></td><td style="font-size:0.78rem;">' + escapeHtml(log.entity_type || '-') + '</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.72rem;color:var(--text-tertiary);">' + escapeHtml(det) + '</td></tr>';
        }).join('');
    } catch (err) {
        console.error('Activity log error:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-tertiary);">Failed to load</td></tr>';
    }
}

// ============================================================
// STORAGE OVERVIEW
// ============================================================
async function loadStorageOverview() {
    var c = document.getElementById('storageOverview');
    if (!c) return;
    c.innerHTML = '<div class="shimmer" style="height:180px;border-radius:12px;grid-column:1/-1;"></div>';
    var buckets = [{ n: 'avatars', l: 5 }, { n: 'events', l: 10 }, { n: 'reports', l: 10 }, { n: 'newsletters', l: 20 }, { n: 'documents', l: 20 }, { n: 'members', l: 5 }, { n: 'general', l: 10 }, { n: 'minutes', l: 20 }, { n: 'esigns', l: 2 }, { n: 'receipts', l: 5 }];
    try {
        if (!supabase) throw new Error('DB not connected');
        var results = await Promise.allSettled(buckets.map(function(b) {
            return supabase.rpc('get_bucket_usage', { p_bucket: b.n }).then(function(r) {
                return { n: b.n, l: b.l, files: r.data && r.data[0] ? parseInt(r.data[0].total_files) || 0 : 0, mb: r.data && r.data[0] ? parseFloat(r.data[0].total_size_mb) || 0 : 0 };
            }).catch(function() { return { n: b.n, l: b.l, files: 0, mb: 0 }; });
        }));
        var data = results.map(function(r) { return r.value || { n: 'unknown', l: 0, files: 0, mb: 0 }; });
        var tu = data.reduce(function(s, d) { return s + d.mb; }, 0);
        var tl = data.reduce(function(s, d) { return s + d.l; }, 0);
        var tPct = tl > 0 ? Math.min(100, (tu / tl) * 100) : 0;
        var html = '<div class="storage-bucket-card" style="grid-column:1/-1;background:linear-gradient(135deg,rgba(0,87,183,0.07),rgba(0,180,216,0.04));border-color:rgba(0,87,183,0.15);"><h4><i data-lucide="database"></i>Total Storage</h4><div class="storage-bar" style="height:10px;margin-bottom:8px;"><div class="storage-bar-fill" style="width:' + tPct.toFixed(1) + '%;"></div></div><div class="storage-usage"><span>' + tu.toFixed(2) + ' MB of ' + tl + ' MB</span><span style="font-weight:700;color:var(--primary);">' + tPct.toFixed(1) + '%</span></div></div>';
        html += data.map(function(d) {
            var pct = d.l > 0 ? Math.min(100, (d.mb / d.l) * 100) : 0;
            var color = pct > 80 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--primary)';
            return '<div class="storage-bucket-card"><h4><i data-lucide="folder"></i>' + capitalizeFirst(d.n) + '</h4><div class="storage-bar"><div class="storage-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + color + ';"></div></div><div class="storage-usage"><span>' + d.mb.toFixed(2) + ' MB / ' + d.l + ' MB</span><span style="color:' + color + ';font-weight:700;">' + pct.toFixed(1) + '%</span></div><div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:5px;">' + d.files + ' file(s)</div></div>';
        }).join('');
        c.innerHTML = html; refreshIcons();
    } catch (err) { c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-tertiary);">Failed to load storage data</div>'; }
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
        if (!logs.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-tertiary);">No mail logs found</td></tr>'; return; }
        tbody.innerHTML = logs.map(function(log) {
            var tl = (log.mail_type || 'custom').replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
            var sc = log.status === 'sent' ? 'badge-success' : log.status === 'failed' ? 'badge-danger' : 'badge-warning';
            return '<tr><td><span class="badge badge-primary">' + escapeHtml(tl) + '</span></td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(log.recipient || '-') + '</td><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(log.subject || '-') + '</td><td><span class="badge ' + sc + '">' + escapeHtml(log.status || 'pending') + '</span></td><td style="font-size:0.78rem;white-space:nowrap;">' + (log.sent_at ? formatTimestamp(log.sent_at) : formatTimestamp(log.created_at)) + '</td></tr>';
        }).join('');
    } catch (err) {
        console.error('Mail logs error:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-tertiary);">Failed to load mail logs</td></tr>';
    }
}

// ============================================================
// CUSTOM MAIL FORM
// ============================================================
function openCustomMailForm() {
    if (!isSecretary()) { showToast('error', 'Denied', 'Secretary or higher access required'); return; }
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="mail"></i>Send Custom Email';
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<form onsubmit="submitCustomMail(event)">',
            '<div class="form-group"><label><i data-lucide="users"></i>Recipients *</label><select id="cmRecipients" required onchange="toggleCustomEmails()"><option value="">Select</option><option value="all">All Members</option><option value="board">Board Members Only</option><option value="custom">Custom Email(s)</option></select></div>',
            '<div id="cmCustomEmailsGroup" style="display:none;"><div class="form-group"><label><i data-lucide="mail"></i>Email Addresses</label><textarea id="cmCustomEmails" rows="3" placeholder="email1@example.com, email2@example.com"></textarea><small style="color:var(--text-tertiary);">Separate multiple emails with commas</small></div></div>',
            '<div class="form-group"><label><i data-lucide="file-text"></i>Subject *</label><input type="text" id="cmSubject" required placeholder="Email subject"></div>',
            '<div class="form-group"><label><i data-lucide="message-square"></i>Message *</label><textarea id="cmMessage" rows="8" required placeholder="Your message..."></textarea></div>',
            '<div style="padding:11px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--text-secondary);"><i data-lucide="info" style="width:13px;height:13px;display:inline;vertical-align:middle;color:var(--primary);"></i> Club signature will be automatically added.</div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button><button type="submit" class="btn btn-primary"><i data-lucide="send"></i>Send Email</button></div>',
            '</form>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

function toggleCustomEmails() {
    var type = document.getElementById('cmRecipients');
    var group = document.getElementById('cmCustomEmailsGroup');
    if (type && group) group.style.display = type.value === 'custom' ? 'block' : 'none';
}

async function submitCustomMail(e) {
    e.preventDefault();
    var recipType = gv('cmRecipients'), subject = gv('cmSubject'), message = gv('cmMessage');
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
        if (!supabase) throw new Error('DB not connected');
        await supabase.from('notification_queue').insert({ notification_type: 'custom', recipient_type: recipType, recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('mail_log').insert({ mail_type: 'custom', recipient: emails.length + ' recipient(s)', subject: subject, body: body, status: 'queued' });
        await logActivity('send_custom_mail', 'mail_log', null, { subject: subject, recipients: emails.length, type: recipType });
        closeModal('formModal');
        showToast('success', 'Queued', 'Email queued for ' + emails.length + ' recipient(s)');
        await loadMailLogs();
    } catch (err) { console.error('Custom mail error:', err); showToast('error', 'Error', err.message || 'Failed'); }
}

// ============================================================
// MEETING INTIMATION — COMPLETE
// ============================================================
async function sendMeetingIntimation(meetingId) {
    var meeting = (AppState.meetings || []).find(function(m) { return m.id === meetingId; });
    if (!meeting) { showToast('error', 'Error', 'Meeting not found'); return; }
    var typeLabel = formatMeetingTypeLabel(meeting.meeting_type);
    var recipDesc = meeting.meeting_type === 'board_meeting' ? 'board members and admins' : 'all members';
    if (!(await confirmAction('Send Intimation?', 'Send meeting invitation to ' + recipDesc + '?', 'Yes, Send'))) return;
    try {
        if (!supabase) throw new Error('DB not connected');
        var members;
        if (meeting.meeting_type === 'board_meeting') {
            members = await getBoardMemberEmails();
            var admins = await supabase.from('admin_users').select('email').eq('is_active', true);
            if (!admins.error && admins.data) {
                admins.data.forEach(function(a) {
                    if (a.email && !members.find(function(m) { return m.email === a.email; })) members.push({ email: a.email });
                });
            }
        } else {
            members = await getAllMemberEmails(false);
        }
        var emails = members.filter(function(m) { return m.email; }).map(function(m) { return m.email; });
        if (!emails.length) { showToast('warning', 'No Recipients', 'No valid email addresses found'); return; }
        var timeStr = formatTime(meeting.start_time) + (meeting.end_time ? ' to ' + formatTime(meeting.end_time) : '');
        var subject = 'Meeting Intimation: ' + meeting.title + ' - ' + formatDateShort(meeting.date) + ' - Rotaract Club of Coimbatore Unity';
        var lines = ['Dear Members,', '', 'You are cordially invited to attend the upcoming ' + typeLabel + '.', '', 'MEETING DETAILS:', '='.repeat(60), 'Title   : ' + meeting.title, 'Type    : ' + typeLabel, 'Date    : ' + formatDate(meeting.date), 'Time    : ' + timeStr, 'Venue   : ' + (meeting.venue || 'To be announced')];
        if (meeting.venue_address) lines.push('Address : ' + meeting.venue_address);
        lines.push('='.repeat(60));
        if (meeting.agenda) { lines.push(''); lines.push('Agenda:'); lines.push(meeting.agenda); }
        if (meeting.description) { lines.push(''); lines.push('Note: ' + meeting.description); }
        lines.push('', 'Your presence is highly appreciated.', 'An attendance form will be shared at the meeting start time.', '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)', 'Email: rc.cbeunity@gmail.com');
        var body = lines.join('\n');
        var nqr = await supabase.from('notification_queue').insert({ notification_type: 'meeting_intimation', recipient_type: meeting.meeting_type === 'board_meeting' ? 'board' : 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), related_entity_type: 'meetings', related_entity_id: meeting.id, status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        if (nqr.error) throw nqr.error;
        await supabase.from('meetings').update({ intimation_sent: true, intimation_sent_at: new Date().toISOString() }).eq('id', meetingId);
        await supabase.from('mail_log').insert({ mail_type: 'meeting_intimation', recipient: emails.length + ' ' + recipDesc, subject: subject, body: body, status: 'queued', related_entity_type: 'meetings', related_entity_id: meetingId });
        await logActivity('send_meeting_intimation', 'meetings', meetingId, { recipients: emails.length, type: meeting.meeting_type });
        showToast('success', 'Sent', 'Meeting invitation queued for ' + emails.length + ' recipient(s)');
        await loadAdminMeetings();
    } catch (err) { console.error('Intimation error:', err); showToast('error', 'Error', err.message || 'Failed to send intimation'); }
}

// ============================================================
// ATTENDANCE FORM — MANUAL TRIGGER
// ============================================================
async function triggerAttendanceMail(meetingId) {
    var meeting = (AppState.meetings || []).find(function(m) { return m.id === meetingId; });
    if (!meeting) { showToast('error', 'Error', 'Meeting not found'); return; }
    if (!(await confirmAction('Send Attendance Form?', 'Send attendance form link to members now?', 'Yes, Send'))) return;
    try {
        if (!supabase) throw new Error('DB not connected');
        var attendanceUrl = window.location.origin + (window.location.pathname || '/') + '?attendance=' + meeting.id;
        var q = supabase.from('members').select('email,full_name').eq('is_active', true);
        if (meeting.meeting_type === 'board_meeting') q = q.eq('is_board_member', true);
        var mr = await q;
        var emails = ((mr.data || []).filter(function(m) { return m.email; })).map(function(m) { return m.email; });
        if (!emails.length) { showToast('warning', 'No Recipients', 'No emails found'); return; }
        var subject = 'Meeting Attendance: ' + meeting.title + ' - Rotaract Club of Coimbatore Unity';
        var body = ['Dear Members,', '', 'ATTENDANCE SHEET', '='.repeat(60), 'Meeting  : ' + meeting.title, 'Type     : ' + formatMeetingTypeLabel(meeting.meeting_type), 'Date     : ' + formatDate(meeting.date), 'Time     : ' + formatTime(meeting.start_time) + (meeting.end_time ? ' to ' + formatTime(meeting.end_time) : ''), 'Venue    : ' + (meeting.venue || 'To be announced'), '='.repeat(60), '', 'Mark your attendance:', attendanceUrl, '', 'The form collects name, designation, RI ID, in-time, and e-signature.', 'Please submit before the meeting ends.', '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)'].join('\n');
        await supabase.from('notification_queue').insert({ notification_type: 'meeting_attendance', recipient_type: meeting.meeting_type === 'board_meeting' ? 'board' : 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), related_entity_type: 'meetings', related_entity_id: meeting.id, status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('meetings').update({ attendance_mail_sent: true, attendance_mail_sent_at: new Date().toISOString(), attendance_form_url: attendanceUrl, status: 'ongoing' }).eq('id', meetingId);
        await supabase.from('mail_log').insert({ mail_type: 'meeting_attendance', recipient: emails.length + ' member(s)', subject: subject, status: 'queued', related_entity_type: 'meetings', related_entity_id: meetingId });
        await logActivity('send_attendance_form', 'meetings', meetingId, { recipients: emails.length });
        showToast('success', 'Sent', 'Attendance form queued for ' + emails.length + ' member(s)');
        await loadAdminMeetings();
    } catch (err) { console.error('Attendance mail error:', err); showToast('error', 'Error', err.message); }
}

// ============================================================
// VIEW MEETING ATTENDANCE
// ============================================================
async function viewMeetingAttendance(meetingId) {
    try {
        var meeting = (AppState.meetings || []).find(function(m) { return m.id === meetingId; });
        if (!meeting) { showToast('error', 'Error', 'Meeting not found'); return; }
        if (!supabase) return;
        var r = await supabase.from('meeting_attendance').select('*').eq('meeting_id', meetingId).order('submitted_at', { ascending: true });
        if (r.error) throw r.error;
        var att = r.data || [];
        var titleEl = document.getElementById('formModalTitle');
        var bodyEl = document.getElementById('formModalBody');
        if (titleEl) titleEl.innerHTML = '<i data-lucide="clipboard-list"></i>Attendance: ' + escapeHtml(meeting.title);
        if (bodyEl) {
            bodyEl.innerHTML = [
                '<div style="padding:14px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);margin-bottom:18px;">',
                '<div style="font-weight:700;margin-bottom:4px;">' + escapeHtml(meeting.title) + '</div>',
                '<div style="font-size:0.82rem;color:var(--text-secondary);">' + formatMeetingTypeLabel(meeting.meeting_type) + ' | ' + formatDate(meeting.date) + ' | ' + formatTime(meeting.start_time) + '</div>',
                '<div style="font-size:0.82rem;color:var(--primary);font-weight:700;margin-top:4px;">Total Present: ' + att.length + '</div>',
                '</div>',
                att.length > 0 ? [
                    '<div class="admin-table-container" style="margin-bottom:16px;">',
                    '<table class="admin-table"><thead><tr><th>S.No</th><th>Name</th><th>Designation</th><th>RI ID</th><th>In Time</th><th>E-Sign</th><th>Submitted</th></tr></thead><tbody>',
                    att.map(function(a, i) {
                        return '<tr><td>' + (i + 1) + '</td><td><strong>' + escapeHtml(a.member_name) + '</strong></td><td>' + escapeHtml(a.designation || '-') + '</td><td>' + escapeHtml(a.ri_id || '-') + '</td><td>' + (a.in_time ? formatTime(a.in_time) : '-') + '</td><td>' + (a.e_sign_url ? '<img src="' + escapeHtml(a.e_sign_url) + '" style="width:40px;height:30px;object-fit:contain;border-radius:4px;cursor:pointer;" onclick="openImageViewer([\'' + escapeHtml(a.e_sign_url) + '\'],0)">' : '-') + '</td><td style="font-size:0.75rem;white-space:nowrap;">' + formatTimestamp(a.submitted_at) + '</td></tr>';
                    }).join(''),
                    '</tbody></table></div>'
                ].join('') : '<div style="text-align:center;padding:40px;color:var(--text-tertiary);"><i data-lucide="clipboard" style="width:32px;height:32px;display:block;margin:0 auto 8px;opacity:0.5;"></i><p>No attendance records yet</p></div>',
                '<div style="display:flex;gap:12px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--border-color);">',
                '<button class="btn btn-outline" onclick="copyAttendanceLink(\'' + meetingId + '\')"><i data-lucide="copy"></i>Copy Link</button>',
                !meeting.attendance_mail_sent ? '<button class="btn btn-outline" onclick="closeModal(\'formModal\');triggerAttendanceMail(\'' + meetingId + '\')"><i data-lucide="send"></i>Send Form</button>' : '',
                att.length > 0 && canDownloadAttendance() ? '<button class="btn btn-outline" onclick="closeModal(\'formModal\');downloadMeetingAttendance(\'' + meetingId + '\')"><i data-lucide="download"></i>Download .docx</button>' : '',
                '<button class="btn btn-primary" onclick="closeModal(\'formModal\')"><i data-lucide="check"></i>Close</button>',
                '</div>'
            ].join('');
        }
        openModal('formModal'); refreshIcons();
    } catch (err) { console.error('View attendance error:', err); showToast('error', 'Error', 'Failed to load attendance'); }
}

function copyAttendanceLink(meetingId) {
    var link = window.location.origin + (window.location.pathname || '/') + '?attendance=' + meetingId;
    copyToClipboard(link);
}

// ============================================================
// SEND MEETING MINUTES MAIL
// ============================================================
async function sendMinutesMailToMembers(meeting, minutesPdfUrl) {
    try {
        if (!supabase || !meeting || !minutesPdfUrl) return;
        var q = supabase.from('members').select('email').eq('is_active', true);
        if (meeting.meeting_type === 'board_meeting') q = q.eq('is_board_member', true);
        var mr = await q;
        var emails = ((mr.data || []).map(function(m) { return m.email; })).filter(Boolean);
        if (meeting.meeting_type === 'board_meeting') {
            var adm = await supabase.from('admin_users').select('email').eq('is_active', true);
            if (!adm.error && adm.data) adm.data.forEach(function(a) { if (a.email && emails.indexOf(a.email) === -1) emails.push(a.email); });
        }
        if (!emails.length) return;
        var subject = 'Meeting Minutes: ' + meeting.title + ' - Rotaract Club of Coimbatore Unity';
        var body = ['Dear Members,', '', 'The minutes of the ' + formatMeetingTypeLabel(meeting.meeting_type) + ' have been published.', '', 'Meeting  : ' + meeting.title, 'Date     : ' + formatDate(meeting.date), 'Time     : ' + formatTime(meeting.start_time), '', 'View Meeting Minutes:', minutesPdfUrl, '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)'].join('\n');
        await supabase.from('notification_queue').insert({ notification_type: 'meeting_minutes', recipient_type: meeting.meeting_type === 'board_meeting' ? 'board' : 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), related_entity_type: 'meetings', related_entity_id: meeting.id, status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('mail_log').insert({ mail_type: 'meeting_minutes', recipient: emails.length + ' member(s)', subject: subject, status: 'queued', related_entity_type: 'meetings', related_entity_id: meeting.id });
        console.log('Minutes mail queued for', emails.length, 'recipients');
    } catch (err) { console.error('Minutes mail error:', err); }
}

// ============================================================
// SEND MONTHLY STATEMENT — MANUAL
// ============================================================
async function sendMonthlyStatement() {
    if (!isTreasurer()) { showToast('error', 'Denied', 'Treasurer or higher access required'); return; }
    if (!(await confirmAction('Send Statement?', 'Send current month treasury statement to all members?', 'Yes, Send'))) return;
    try {
        if (!supabase) throw new Error('DB not connected');
        var now = new Date();
        var mS = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        var mE = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        var mN = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        var tr = await supabase.from('treasury').select('*').gte('date', mS).lte('date', mE).order('date', { ascending: true });
        var txns = tr.data || [];
        var income = txns.reduce(function(s, t) { return s + (t.transaction_type === 'income' ? parseFloat(t.amount) : 0); }, 0);
        var expense = txns.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);
        var allT = await supabase.from('treasury').select('transaction_type,amount');
        var overall = (allT.data || []).reduce(function(s, t) { return s + (t.transaction_type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)); }, 0);
        var lines = ['Dear Members,', '', 'Monthly Treasury Statement for ' + mN + ':', '', '='.repeat(50), 'TREASURY STATEMENT - ' + mN.toUpperCase(), 'Rotaract Club of Coimbatore Unity', '='.repeat(50), ''];
        if (txns.length) { lines.push('TRANSACTIONS:'); lines.push('-'.repeat(50)); txns.forEach(function(t, i) { lines.push((i + 1) + '. [' + formatDateShort(t.date) + '] ' + t.particular + ' - ' + capitalizeFirst(t.transaction_type) + ': Rs. ' + formatCurrency(t.amount)); }); lines.push('-'.repeat(50)); }
        else lines.push('No transactions recorded this month.');
        lines.push('', 'SUMMARY:', 'Total Income    : Rs. ' + formatCurrency(income), 'Total Expenses  : Rs. ' + formatCurrency(expense), 'Net This Month  : Rs. ' + formatCurrency(income - expense), 'Overall Balance : Rs. ' + formatCurrency(overall), '', '='.repeat(50), '', 'This is a system-generated statement.', '', 'Regards,', 'Treasurer', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)');
        var body = lines.join('\n');
        var members = await getAllMemberEmails(false);
        var emails = members.map(function(m) { return m.email; }).filter(Boolean);
        if (!emails.length) { showToast('warning', 'No Recipients', 'No member emails found'); return; }
        var subject = 'Treasury Statement - ' + mN + ' - Rotaract Club of Coimbatore Unity';
        await supabase.from('notification_queue').insert({ notification_type: 'monthly_statement', recipient_type: 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('mail_log').insert({ mail_type: 'monthly_statement', recipient: emails.length + ' member(s)', subject: subject, body: body, status: 'queued' });
        await logActivity('send_monthly_statement', 'treasury', null, { month: mN, recipients: emails.length });
        showToast('success', 'Queued', 'Statement queued for ' + emails.length + ' member(s)');
    } catch (err) { console.error('Monthly statement error:', err); showToast('error', 'Error', err.message || 'Failed'); }
}

// ============================================================
// APPROVE EVENT (admin panel version)
// ============================================================
async function approveEventFromAdmin(eventId) {
    if (!canApproveProjects()) { showToast('error', 'Denied', 'President, Advisor or Super Admin only'); return; }
    if (!(await confirmAction('Approve Event?', 'This event will be published and all members notified.', 'Yes, Approve'))) return;
    try {
        if (!supabase) throw new Error('DB not connected');
        var upd = await supabase.from('events').update({ status: 'approved', approved_by: AppState.currentAdmin.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', eventId);
        if (upd.error) throw upd.error;
        var evR = await supabase.from('events').select('*').eq('id', eventId).single();
        if (!evR.error && evR.data) await _sendProjectApprovalMail(evR.data);
        await logActivity('approve_event', 'events', eventId, {});
        showToast('success', 'Approved', 'Event approved and members notified.');
        await loadAdminEvents();
        if (typeof loadAdminDashboard === 'function') await loadAdminDashboard();
        if (typeof loadUpcomingEvents === 'function') await loadUpcomingEvents();
    } catch (err) { console.error('Approve event error:', err); showToast('error', 'Error', err.message); }
}

async function _sendProjectApprovalMail(ev) {
    try {
        if (!supabase || !ev) return;
        var members = await getAllMemberEmails(false);
        var emails = members.map(function(m) { return m.email; }).filter(Boolean);
        if (!emails.length) return;
        var tStr = ev.start_time ? (formatTime(ev.start_time) + (ev.end_time ? ' to ' + formatTime(ev.end_time) : '')) : 'Time to be announced';
        var subject = 'New Event: ' + ev.title + ' - Rotaract Club of Coimbatore Unity';
        var lines = ['Dear Members,', '', 'We are pleased to announce a new event!', '', 'EVENT DETAILS:', '='.repeat(60), 'Event   : ' + ev.title, 'Avenue  : ' + formatAvenueLabel(ev.avenue), 'Date    : ' + formatDate(ev.date), 'Time    : ' + tStr, 'Venue   : ' + (ev.venue || 'To be announced')];
        if (ev.event_chair) lines.push('Chair   : ' + ev.event_chair);
        if (ev.proposed_by) lines.push('Proposed: ' + ev.proposed_by);
        lines.push('='.repeat(60));
        if (ev.description) { lines.push(''); lines.push('Description:'); lines.push(ev.description); }
        lines.push('', 'We look forward to your participation!', '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Family of Rotary Club of Coimbatore East', 'Rotary International District 3206 (Coimbatore | Pallakkad)', 'Email: rc.cbeunity@gmail.com');
        var body = lines.join('\n');
        await supabase.from('notification_queue').insert({ notification_type: 'project_approved', recipient_type: 'all', recipient_emails: emails, subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), related_entity_type: 'events', related_entity_id: ev.id, status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
        await supabase.from('mail_log').insert({ mail_type: 'project_approved', recipient: emails.length + ' member(s)', subject: subject, status: 'queued', related_entity_type: 'events', related_entity_id: ev.id });
        await supabase.from('events').update({ mail_sent: true }).eq('id', ev.id);
        console.log('Project approval mail queued for', emails.length, 'recipients');
    } catch (err) { console.error('Project approval mail error:', err); }
}

// ============================================================
// VIEW APPLICATION DETAIL
// ============================================================
async function viewApplicationDetail(appId) {
    var app = (AppState.applications || []).find(function(a) { return a.id === appId; });
    if (!app && supabase) {
        var r = await supabase.from('membership_applications').select('*').eq('id', appId).single();
        if (!r.error && r.data) app = r.data;
    }
    if (!app) { showToast('error', 'Error', 'Application not found'); return; }
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="user-plus"></i>Application: ' + escapeHtml(app.full_name);
    if (bodyEl) {
        var hp = app.photo_url && app.photo_url.startsWith('http');
        var fds = [['mail', 'Email', app.email], ['phone', 'Phone', app.phone], ['calendar', 'Date of Birth', app.date_of_birth ? formatDate(app.date_of_birth) : ''], ['droplet', 'Blood Group', app.blood_group], ['briefcase', 'Profession', app.profession], ['map-pin', 'Area', app.area], ['home', 'Address', app.address], ['user-check', 'Reference', app.reference], ['clock', 'Applied', getRelativeTime(app.created_at)]].filter(function(f) { return f[2]; });
        bodyEl.innerHTML = [
            '<div style="display:flex;gap:22px;flex-wrap:wrap;">',
            '<div style="text-align:center;flex-shrink:0;min-width:150px;">',
            '<div style="width:110px;height:110px;border-radius:50%;margin:0 auto 12px;overflow:hidden;border:3px solid var(--primary);background:var(--bg-tertiary);">' + (hp ? '<img src="' + escapeHtml(app.photo_url) + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i data-lucide="user" style="width:44px;height:44px;color:var(--text-tertiary);"></i></div>') + '</div>',
            '<span class="table-status status-' + (app.status === 'pending' ? 'proposed' : app.status === 'approved' ? 'approved' : 'cancelled') + '">' + capitalizeFirst(app.status) + '</span></div>',
            '<div style="flex:1;min-width:260px;"><h3 style="font-size:1.05rem;font-weight:800;margin-bottom:16px;">' + escapeHtml(app.full_name) + '</h3>',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + fds.map(function(f) { return '<div style="padding:9px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius-sm);"><div style="font-size:0.68rem;color:var(--text-tertiary);display:flex;align-items:center;gap:4px;margin-bottom:3px;"><i data-lucide="' + f[0] + '" style="width:11px;height:11px;"></i>' + f[1] + '</div><div style="font-size:0.82rem;font-weight:700;word-break:break-word;">' + escapeHtml(String(f[2])) + '</div></div>'; }).join('') + '</div>',
            app.reason_to_join ? '<div style="margin-top:14px;padding:13px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);"><div style="font-size:0.75rem;font-weight:700;color:var(--primary);margin-bottom:6px;">Reason to Join</div><p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">' + escapeHtml(app.reason_to_join) + '</p></div>' : '',
            app.review_notes ? '<div style="margin-top:10px;padding:13px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius-sm);"><div style="font-size:0.75rem;font-weight:700;color:var(--warning);margin-bottom:4px;">Review Notes</div><p style="font-size:0.85rem;color:var(--text-secondary);">' + escapeHtml(app.review_notes) + '</p></div>' : '',
            '</div></div>',
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:22px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Close</button>',
            app.status === 'pending' ? '<button class="btn btn-danger" onclick="closeModal(\'formModal\');rejectApplication(\'' + app.id + '\')"><i data-lucide="x-circle"></i>Reject</button><button class="btn btn-success" onclick="closeModal(\'formModal\');approveApplication(\'' + app.id + '\')"><i data-lucide="check-circle"></i>Approve</button>' : '',
            app.status === 'approved' ? '<button class="btn btn-primary" onclick="closeModal(\'formModal\');convertApplicationToMember(\'' + app.id + '\')"><i data-lucide="user-plus"></i>Add as Member</button>' : '',
            '</div>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

// ============================================================
// APPROVE APPLICATION WITH MAIL
// ============================================================
async function approveApplication(appId) {
    if (!(await confirmAction('Approve Application?', 'The applicant will be notified.', 'Yes, Approve'))) return;
    try {
        if (!supabase) return;
        var upd = await supabase.from('membership_applications').update({ status: 'approved', reviewed_by: AppState.currentAdmin ? AppState.currentAdmin.id : null, reviewed_at: new Date().toISOString() }).eq('id', appId);
        if (upd.error) throw upd.error;
        var appR = await supabase.from('membership_applications').select('*').eq('id', appId).single();
        if (!appR.error && appR.data && appR.data.email) {
            var app = appR.data;
            var subject = 'Welcome to Rotaract Club of Coimbatore Unity!';
            var body = ['Dear ' + app.full_name + ',', '', 'We are delighted to inform you that your membership application to Rotaract Club of Coimbatore Unity has been APPROVED!', '', 'Welcome to the family!', '', 'CLUB DETAILS:', 'Club Name : Rotaract Club of Coimbatore Unity', 'Parent    : Rotary Club of Coimbatore East', 'District  : Rotary International District 3206 (Coimbatore | Pallakkad)', 'Club ID   : 91594', '', 'NEXT STEPS:', '1. Attend the next club meeting', '2. Connect with your fellow Rotaractors', '3. Follow us on social media @rotaractunity', '4. Check our website for upcoming events', '', 'Together, we serve!', '', 'Regards,', 'Rotaract Club of Coimbatore Unity', 'Email: rc.cbeunity@gmail.com'].join('\n');
            await supabase.from('notification_queue').insert({ notification_type: 'membership_approved', recipient_type: 'individual', recipient_emails: [app.email], subject: subject, body: body, html_body: body.replace(/\n/g, '<br>'), status: 'queued', created_by: AppState.currentAdmin ? AppState.currentAdmin.id : null });
            await supabase.from('mail_log').insert({ mail_type: 'membership_approved', recipient: app.email, subject: subject, status: 'queued' });
        }
        await logActivity('approve_application', 'membership_applications', appId, {});
        showToast('success', 'Approved', 'Application approved. Welcome email queued.');
        await loadAdminApplications();
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function rejectApplication(appId) {
    if (!window.Swal) { if (!(await confirmAction('Reject?', 'Reject this application?', 'Yes, Reject'))) return; }
    var result = window.Swal ? await Swal.fire({ title: 'Reject Application?', input: 'textarea', inputLabel: 'Reason (optional)', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Reject', cancelButtonText: 'Cancel', background: AppState.theme === 'dark' ? '#1a1a36' : '#ffffff', color: AppState.theme === 'dark' ? '#f0f0f5' : '#1a1a2e' }) : { isConfirmed: true, value: '' };
    if (!result.isConfirmed) return;
    try {
        if (!supabase) return;
        var upd = await supabase.from('membership_applications').update({ status: 'rejected', reviewed_by: AppState.currentAdmin ? AppState.currentAdmin.id : null, reviewed_at: new Date().toISOString(), review_notes: result.value || null }).eq('id', appId);
        if (upd.error) throw upd.error;
        await logActivity('reject_application', 'membership_applications', appId, { notes: result.value });
        showToast('info', 'Rejected', 'Application rejected'); await loadAdminApplications();
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function convertApplicationToMember(appId) {
    var app = (AppState.applications || []).find(function(a) { return a.id === appId; });
    if (!app && supabase) { var r = await supabase.from('membership_applications').select('*').eq('id', appId).single(); if (!r.error) app = r.data; }
    if (!app) { showToast('error', 'Error', 'Application not found'); return; }
    if (!(await confirmAction('Add as Member?', 'Create a member profile for ' + app.full_name + '?', 'Yes, Add Member'))) return;
    try {
        if (!supabase) return;
        if (app.email) {
            var ex = await supabase.from('members').select('id').eq('email', app.email).single();
            if (ex.data) { showToast('warning', 'Exists', 'A member with this email already exists'); return; }
        }
        var ins = await supabase.from('members').insert({ full_name: app.full_name, email: app.email || null, phone: app.phone || null, date_of_birth: app.date_of_birth || null, blood_group: app.blood_group || null, photo_url: app.photo_url || null, profession: app.profession || null, area: app.area || null, address: app.address || null, designation: 'Member', membership_type: 'active', is_active: true, is_board_member: false, show_on_website: true, join_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (ins.error) throw ins.error;
        await supabase.from('membership_applications').update({ status: 'approved', review_notes: 'Converted to member' }).eq('id', appId);
        await logActivity('convert_to_member', 'membership_applications', appId, { name: app.full_name });
        showToast('success', 'Added', app.full_name + ' added as a member');
        await loadAdminApplications();
        if (typeof loadAdminMembers === 'function') await loadAdminMembers();
        if (typeof loadPublicMembers === 'function') await loadPublicMembers();
    } catch (err) { showToast('error', 'Error', err.message); }
}

// ============================================================
// COMBINED REPORT DOWNLOAD
// ============================================================
async function downloadCombinedReport() {
    if (!canDownloadReports()) { showToast('error', 'Denied', 'No permission to download reports'); return; }
    var titleEl = document.getElementById('formModalTitle');
    var bodyEl = document.getElementById('formModalBody');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="download"></i>Download Combined Report';
    var curM = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    if (bodyEl) {
        bodyEl.innerHTML = [
            '<div style="margin-bottom:18px;padding:14px;background:rgba(0,87,183,0.06);border:1px solid rgba(0,87,183,0.12);border-radius:var(--radius-sm);font-size:0.85rem;color:var(--text-secondary);">Select the type of report to generate. Reports are downloaded as <strong>.docx</strong> files with event details and action photographs.</div>',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">',
            '<button class="btn btn-outline" style="flex-direction:column;height:auto;padding:18px 14px;gap:8px;" onclick="selectRptType(\'month\')"><i data-lucide="calendar" style="width:26px;height:26px;color:var(--primary);"></i><strong style="font-size:0.85rem;">Current Month</strong><span style="font-size:0.72rem;color:var(--text-tertiary);font-weight:400;">' + curM + '</span></button>',
            '<button class="btn btn-outline" style="flex-direction:column;height:auto;padding:18px 14px;gap:8px;" onclick="selectRptType(\'pick_month\')"><i data-lucide="calendar-range" style="width:26px;height:26px;color:var(--primary);"></i><strong style="font-size:0.85rem;">Select Month</strong><span style="font-size:0.72rem;color:var(--text-tertiary);font-weight:400;">Choose specific month</span></button>',
            '<button class="btn btn-outline" style="flex-direction:column;height:auto;padding:18px 14px;gap:8px;" onclick="selectRptType(\'pick_avenue\')"><i data-lucide="layers" style="width:26px;height:26px;color:var(--primary);"></i><strong style="font-size:0.85rem;">By Avenue</strong><span style="font-size:0.72rem;color:var(--text-tertiary);font-weight:400;">Filter by service avenue</span></button>',
            '<button class="btn btn-primary" style="flex-direction:column;height:auto;padding:18px 14px;gap:8px;" onclick="selectRptType(\'all\')"><i data-lucide="file-text" style="width:26px;height:26px;"></i><strong style="font-size:0.85rem;">All Projects</strong><span style="font-size:0.72rem;color:rgba(255,255,255,0.75);font-weight:400;">Complete report</span></button>',
            '</div>',
            '<div id="rptMonthPicker" style="display:none;margin-bottom:14px;"><div class="form-group"><label><i data-lucide="calendar"></i>Select Month</label><input type="month" id="rptMonthInput" value="' + new Date().toISOString().substring(0, 7) + '"></div><button class="btn btn-primary btn-block" onclick="executeRpt(\'picked_month\')"><i data-lucide="download"></i>Generate Report</button></div>',
            '<div id="rptAvenuePicker" style="display:none;margin-bottom:14px;"><div class="form-group"><label><i data-lucide="layers"></i>Select Avenue</label><select id="rptAvenueInput"><option value="club_service">Club Service</option><option value="community_service">Community Service</option><option value="professional_service">Professional Service</option><option value="international_service">International Service</option><option value="district_priority">District Priority Projects</option></select></div><button class="btn btn-primary btn-block" onclick="executeRpt(\'picked_avenue\')"><i data-lucide="download"></i>Generate Report</button></div>',
            '<button class="btn btn-outline btn-block" onclick="closeModal(\'formModal\')" style="margin-top:6px;"><i data-lucide="x"></i>Cancel</button>'
        ].join('');
    }
    openModal('formModal'); refreshIcons();
}

function selectRptType(type) {
    var mp = document.getElementById('rptMonthPicker');
    var ap = document.getElementById('rptAvenuePicker');
    if (type === 'pick_month') { if (mp) mp.style.display = 'block'; if (ap) ap.style.display = 'none'; refreshIcons(); return; }
    if (type === 'pick_avenue') { if (mp) mp.style.display = 'none'; if (ap) ap.style.display = 'block'; refreshIcons(); return; }
    executeRpt(type);
}

async function executeRpt(type) {
    if (!supabase) { showToast('error', 'Error', 'DB not connected'); return; }
    if (!window.docx || !window.docx.Document) { showToast('error', 'Library Missing', 'Document library not loaded. Please refresh the page.'); return; }
    var events = [], reportTitle = '';
    try {
        if (type === 'month') {
            var n = new Date(), mS = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], mE = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0], mN = n.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            var r1 = await supabase.from('events').select('*').eq('status', 'completed').eq('report_submitted', true).gte('date', mS).lte('date', mE).order('date', { ascending: true });
            events = r1.data || []; reportTitle = 'Monthly Report - ' + mN;
        } else if (type === 'picked_month') {
            var sm = gv('rptMonthInput'); if (!sm) { showToast('error', 'Required', 'Please select a month'); return; }
            var sd = new Date(sm + '-01'), sS = sm + '-01', sE = new Date(sd.getFullYear(), sd.getMonth() + 1, 0).toISOString().split('T')[0], sN = sd.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            var r2 = await supabase.from('events').select('*').eq('status', 'completed').eq('report_submitted', true).gte('date', sS).lte('date', sE).order('date', { ascending: true });
            events = r2.data || []; reportTitle = 'Monthly Report - ' + sN;
        } else if (type === 'picked_avenue') {
            var sa = gv('rptAvenueInput'); if (!sa) { showToast('error', 'Required', 'Please select an avenue'); return; }
            var r3 = await supabase.from('events').select('*').eq('status', 'completed').eq('report_submitted', true).eq('avenue', sa).order('date', { ascending: true });
            events = r3.data || []; reportTitle = formatAvenueLabel(sa) + ' - Combined Report';
        } else {
            var r4 = await supabase.from('events').select('*').eq('status', 'completed').eq('report_submitted', true).order('date', { ascending: true });
            events = r4.data || []; reportTitle = 'Complete Projects Report';
        }
        if (!events.length) { showToast('info', 'No Reports', 'No submitted reports found for the selected criteria'); return; }
        closeModal('formModal');
        showToast('info', 'Generating', 'Preparing report for ' + events.length + ' project(s)...', 15000);
        if (typeof buildCombinedReport === 'function') {
            var doc = await buildCombinedReport(events, reportTitle);
            var blob = await window.docx.Packer.toBlob(doc);
            var fileName = (typeof slugify === 'function' ? slugify(reportTitle) : 'report') + '_' + new Date().toISOString().split('T')[0] + '.docx';
            if (window.saveAs) saveAs(blob, fileName);
            await logActivity('download_combined_report', 'events', null, { type: type, count: events.length, title: reportTitle });
            showToast('success', 'Downloaded', 'Report with ' + events.length + ' project(s) downloaded');
        } else { showToast('error', 'Error', 'Report generator not found. Ensure reports.js is loaded.'); }
    } catch (err) { console.error('Report error:', err); showToast('error', 'Error', err.message || 'Failed to generate report'); }
}

// ============================================================
// SUPER ADMIN CONTROLS
// ============================================================
async function forceRefreshPublicData() {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    showToast('info', 'Refreshing', 'Reloading all data...');
    try {
        await Promise.allSettled([loadSettings(), loadPublicStatistics(), loadPublicBenefits(), loadUpcomingEvents(), loadCompletedProjects(), loadPublicMembers(), loadPublicTrainers(), loadPastPresidents(), loadPastSecretaries(), loadPublicNewsletters()]);
        applySettingsToPage(); initSocialLinks(); setTimeout(addRevealClasses, 200);
        showToast('success', 'Refreshed', 'All public data reloaded');
    } catch (err) { showToast('error', 'Error', 'Some data failed to refresh'); }
}

async function clearNotificationQueue() {
    if (!isSuperAdmin()) return;
    if (!(await confirmAction('Clear Queue?', 'Remove all queued notifications?', 'Yes, Clear'))) return;
    try {
        if (!supabase) return;
        var r = await supabase.from('notification_queue').delete().eq('status', 'queued');
        if (r.error) throw r.error;
        await logActivity('clear_notification_queue', 'notification_queue', null, {});
        showToast('success', 'Cleared', 'Notification queue cleared');
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function runDatabaseHealthCheck() {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    showToast('info', 'Checking', 'Running health check...');
    var tables = ['admin_users', 'club_settings', 'members', 'events', 'meetings', 'treasury', 'club_statistics', 'joining_benefits', 'game_scores', 'chatbot_conversations', 'notification_queue', 'activity_log', 'mail_log'];
    try {
        if (!supabase) throw new Error('Not connected');
        var results = await Promise.allSettled(tables.map(function(t) {
            return supabase.from(t).select('id', { count: 'exact', head: true }).then(function(r) { return { t: t, ok: !r.error, c: r.count || 0, e: r.error ? r.error.message : null }; }).catch(function(e) { return { t: t, ok: false, c: 0, e: e.message }; });
        }));
        var res = results.map(function(r) { return r.value || { t: 'unknown', ok: false, c: 0 }; });
        var hasErr = res.some(function(r) { return !r.ok; });
        var titleEl = document.getElementById('formModalTitle');
        var bodyEl = document.getElementById('formModalBody');
        if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (hasErr ? 'alert-triangle' : 'check-circle') + '"></i>Database Health Check';
        if (bodyEl) {
            bodyEl.innerHTML = '<div style="padding:13px;margin-bottom:14px;background:' + (hasErr ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)') + ';border:1px solid ' + (hasErr ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)') + ';border-radius:var(--radius-sm);"><strong style="color:' + (hasErr ? 'var(--danger)' : 'var(--success)') + ';">' + (hasErr ? 'Issues detected' : 'All systems healthy') + '</strong></div><div class="admin-table-container"><table class="admin-table"><thead><tr><th>Table</th><th>Status</th><th>Records</th><th>Details</th></tr></thead><tbody>' + res.map(function(r) { return '<tr><td><strong>' + escapeHtml(r.t) + '</strong></td><td><span class="badge ' + (r.ok ? 'badge-success' : 'badge-danger') + '">' + (r.ok ? 'OK' : 'ERROR') + '</span></td><td>' + r.c + '</td><td style="font-size:0.75rem;color:var(--text-tertiary);">' + (r.e ? escapeHtml(r.e) : 'Healthy') + '</td></tr>'; }).join('') + '</tbody></table></div><div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button class="btn btn-outline" onclick="exportDatabaseBackup()"><i data-lucide="download"></i>Backup</button><button class="btn btn-primary" onclick="closeModal(\'formModal\')"><i data-lucide="check"></i>Close</button></div>';
        }
        await logActivity('database_health_check', 'system', null, { errors: res.filter(function(r) { return !r.ok; }).length });
        openModal('formModal'); refreshIcons();
    } catch (err) { showToast('error', 'Error', err.message); }
}

async function exportDatabaseBackup() {
    if (!isSuperAdmin()) { showToast('error', 'Denied', 'Super Admin only'); return; }
    showToast('info', 'Exporting', 'Preparing backup...');
    try {
        if (!supabase || !window.saveAs) throw new Error('Requirements not met');
        var tables = ['club_settings', 'members', 'past_presidents', 'past_secretaries', 'club_trainers', 'events', 'meetings', 'treasury', 'newsletters', 'club_statistics', 'joining_benefits', 'rotary_years'];
        var backup = { exported_at: new Date().toISOString(), club: 'Rotaract Club of Coimbatore Unity', tables: {} };
        for (var i = 0; i < tables.length; i++) { var r = await supabase.from(tables[i]).select('*'); backup.tables[tables[i]] = r.data || []; }
        var aR = await supabase.from('admin_users').select('id,email,full_name,role,is_active,last_login,created_at');
        backup.tables['admin_users'] = aR.data || [];
        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        saveAs(blob, 'Rotaract_Unity_Backup_' + new Date().toISOString().split('T')[0] + '.json');
        await logActivity('export_database_backup', 'system', null, { tables: tables.length });
        showToast('success', 'Done', 'Database backup downloaded');
    } catch (err) { showToast('error', 'Failed', err.message); }
}

function resetAndReload() {
    if (!isSuperAdmin()) return;
    AppState.settings = {}; AppState.settingsCache = {}; AppState.members = []; AppState.events = []; AppState.allProjects = [];
    removeLocal('last_monthly_stmt');
    showToast('info', 'Resetting', 'Reloading...');
    setTimeout(function() { window.location.reload(); }, 1200);
}

// ============================================================
// QUICK ACTIONS
// ============================================================
function quickNewEvent() { showAdminPage('events'); setTimeout(function() { if (typeof openEventForm === 'function') openEventForm(); }, 350); }
function quickNewMeeting() { showAdminPage('meetings'); setTimeout(function() { if (typeof openMeetingForm === 'function') openMeetingForm(); }, 350); }
function quickNewMember() { showAdminPage('members'); setTimeout(function() { if (typeof openMemberForm === 'function') openMemberForm(); }, 350); }
function quickAddTransaction() { showAdminPage('treasury'); setTimeout(function() { if (typeof openTreasuryForm === 'function') openTreasuryForm(); }, 350); }
function quickViewApplications() { showAdminPage('applications'); }
function quickSendMail() { openCustomMailForm(); }

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', function(e) {
    var panel = document.getElementById('adminPanel');
    if (!panel || panel.style.display !== 'flex' || !AppState.currentAdmin) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
            case 'd': e.preventDefault(); showAdminPage('dashboard'); break;
            case 'e': e.preventDefault(); showAdminPage('events'); break;
            case 'm': e.preventDefault(); showAdminPage('members'); break;
            case 't': e.preventDefault(); if (isTreasurer()) showAdminPage('treasury'); break;
            case 'r': e.preventDefault(); showAdminPage('reports'); break;
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); backToWebsite(); }
});

// ============================================================
// AUTO-INITIALIZE
// ============================================================
(function() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminModule);
    else initAdminModule();
})();