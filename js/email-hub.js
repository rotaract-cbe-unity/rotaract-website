// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// EMAIL COMMUNICATION HUB MODULE
// File: js/email-hub.js | Version: 3.1.0
// Features: Broadcast | Templates | Preview
// Scheduling | Drafts | Analytics | Audit
// Mail dispatched through the Apps Script web app (Code.gs)
// ============================================

(function () {
    'use strict';

    // Mail service: Google Apps Script web app (Code.gs v4+).
    // POSTed as text/plain so the browser does not need a CORS preflight.
    const GAS_EMAIL_URL = 'https://script.google.com/macros/s/AKfycbwiPZ3D7xPhbJ617w4xH2pCP_7EpIWH9HgEdJEEmVEuKD7tMcUMS1ei114jmE-fK8cPew/exec';

    async function postToScript(payload) {
        const resp = await fetch(GAS_EMAIL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const text = await resp.text();
        let result;
        try { result = JSON.parse(text); }
        catch (e) { throw new Error('Mail service gave an unexpected reply. Check the Apps Script deployment is "Execute as: Me" and "Who has access: Anyone".'); }
        if (!result.success) throw new Error(result.error || 'Mail service reported a failure');
        return result;
    }

    const EmailHub = {
        // ==========================================
        // STATE
        // ==========================================
        stats: { sent_today: 0, total_sent: 0, queued: 0, failed: 0 },
        recentEmails: [],
        drafts: [],
        currentTemplate: null,

        // ==========================================
        // TEMPLATES
        // ==========================================
        templates: {
            announcement: {
                icon: 'fa-bullhorn',
                color: 'blue',
                label: 'Announcement',
                subject: 'Important Club Announcement',
                body: `<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1a73e8, #7c3aed); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Rotaract Club of Coimbatore Unity</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 12px;">Club ID: 91594 | District 3206</p>
    </div>
    <div style="padding: 32px;">
        <h2 style="color: #1a73e8; margin: 0 0 16px; font-size: 18px;">📢 Important Announcement</h2>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Dear Rotaractors,</p>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">We are pleased to share the following important announcement with the Unity family:</p>
        <div style="background: #f0f6ff; border-left: 4px solid #1a73e8; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #1e293b; margin: 0; font-size: 14px; line-height: 1.7;">[Enter your announcement details here]</p>
        </div>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Stay connected and keep serving!</p>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Warm regards,<br><strong style="color: #1a73e8;">Rotaract Club of Coimbatore Unity</strong></p>
        <p style="color: #cbd5e1; font-size: 10px; margin: 8px 0 0;">rc.cbeunity@gmail.com | Service Above Self</p>
    </div>
</div>`
            },
            reminder: {
                icon: 'fa-bell',
                color: 'yellow',
                label: 'Reminder',
                subject: 'Friendly Reminder',
                body: `<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #eab308, #f59e0b); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🔔 Friendly Reminder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 12px;">Rotaract Club of Coimbatore Unity</p>
    </div>
    <div style="padding: 32px;">
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Dear Rotaractors,</p>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">This is a gentle reminder regarding the following:</p>
        <div style="background: #fefce8; border: 1px solid #fde047; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="color: #854d0e; margin: 0; font-size: 16px; font-weight: 700;">[Enter reminder details here]</p>
            <p style="color: #a16207; margin: 8px 0 0; font-size: 13px;">[Date, Time, Venue if applicable]</p>
        </div>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Please take note and respond at your earliest convenience.</p>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;"><strong style="color: #eab308;">Rotaract Club of Coimbatore Unity</strong></p>
    </div>
</div>`
            },
            appreciation: {
                icon: 'fa-heart',
                color: 'green',
                label: 'Appreciation',
                subject: 'Heartfelt Thank You & Appreciation',
                body: `<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">💚 Thank You!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 12px;">Rotaract Club of Coimbatore Unity</p>
    </div>
    <div style="padding: 32px;">
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Dear Rotaractors,</p>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">We would like to express our heartfelt appreciation and gratitude for your outstanding contribution to:</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="color: #166534; margin: 0; font-size: 16px; font-weight: 700;">[Enter appreciation details here]</p>
        </div>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Your dedication, energy, and commitment to service above self truly make a difference in our community. Unity is stronger because of members like you!</p>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">With gratitude,<br><strong style="color: #22c55e;">Rotaract Club of Coimbatore Unity</strong></p>
    </div>
</div>`
            },
            urgent: {
                icon: 'fa-triangle-exclamation',
                color: 'red',
                label: 'Urgent Notice',
                subject: '🚨 URGENT: Immediate Attention Required',
                body: `<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid #ef4444;">
    <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🚨 URGENT NOTICE</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 12px;">Immediate Attention Required</p>
    </div>
    <div style="padding: 32px;">
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Dear Rotaractors,</p>
        <div style="background: #fef2f2; border: 2px solid #fecaca; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 15px; font-weight: 700; line-height: 1.6;">[Enter urgent details here]</p>
        </div>
        <p style="color: #dc2626; font-weight: 700; font-size: 14px;">⚠️ Please respond or take action immediately.</p>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">If you have any questions, contact the Executive Board immediately.</p>
    </div>
    <div style="background: #fef2f2; padding: 20px; text-align: center; border-top: 1px solid #fecaca;">
        <p style="color: #991b1b; font-size: 11px; margin: 0;"><strong>Rotaract Club of Coimbatore Unity — Executive Board</strong></p>
    </div>
</div>`
            },
            meeting: {
                icon: 'fa-people-group',
                color: 'purple',
                label: 'Meeting Notice',
                subject: 'Meeting Notice',
                body: `<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">📋 Meeting Notice</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 12px;">Rotaract Club of Coimbatore Unity</p>
    </div>
    <div style="padding: 32px;">
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Dear Rotaractors,</p>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">You are hereby notified of the following meeting:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 10px; background: #f5f3ff; font-weight: 700; color: #5b21b6; width: 120px; border: 1px solid #e9d5ff;">Meeting</td><td style="padding: 10px; border: 1px solid #e9d5ff; color: #334155;">[Meeting Name]</td></tr>
            <tr><td style="padding: 10px; background: #f5f3ff; font-weight: 700; color: #5b21b6; border: 1px solid #e9d5ff;">Date</td><td style="padding: 10px; border: 1px solid #e9d5ff; color: #334155;">[Date]</td></tr>
            <tr><td style="padding: 10px; background: #f5f3ff; font-weight: 700; color: #5b21b6; border: 1px solid #e9d5ff;">Time</td><td style="padding: 10px; border: 1px solid #e9d5ff; color: #334155;">[Time]</td></tr>
            <tr><td style="padding: 10px; background: #f5f3ff; font-weight: 700; color: #5b21b6; border: 1px solid #e9d5ff;">Venue</td><td style="padding: 10px; border: 1px solid #e9d5ff; color: #334155;">[Venue / Online Link]</td></tr>
        </table>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Your attendance is highly valued. Please confirm your participation.</p>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;"><strong style="color: #7c3aed;">Rotaract Club of Coimbatore Unity</strong></p>
    </div>
</div>`
            },
            project: {
                icon: 'fa-rocket',
                color: 'cyan',
                label: 'Project Update',
                subject: 'Project Update',
                body: `<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🚀 Project Update</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 12px;">Rotaract Club of Coimbatore Unity</p>
    </div>
    <div style="padding: 32px;">
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Dear Rotaractors,</p>
        <p style="color: #334155; line-height: 1.7; font-size: 14px;">Here is the latest update on our ongoing project:</p>
        <div style="background: #ecfeff; border: 1px solid #a5f3fc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #155e75; margin: 0 0 8px; font-size: 16px;">[Project Name]</h3>
            <p style="color: #164e63; margin: 0; font-size: 14px; line-height: 1.7;">[Enter project update details here]</p>
        </div>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;"><strong style="color: #06b6d4;">Rotaract Club of Coimbatore Unity</strong></p>
    </div>
</div>`
            }
        },

        // ==========================================
        // MAIN RENDER
        // ==========================================
        async render(workspace) {
            if (!window.AdminPanel.isExecutive(window.AuthManager.currentUser.role)) {
                workspace.innerHTML = window.AdminPanel.renderUnauthorized();
                return;
            }

            workspace.innerHTML = window.AdminPanel.renderLoader();

            try {
                await this.loadStats();
                await this.loadRecent();
                this.loadDrafts();

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <!-- Header -->
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb">
                                    <i class="fa-solid fa-house text-brand-blue"></i>
                                    <span>/</span>
                                    <span>Email Communication Hub</span>
                                </div>
                                <h1 class="admin-page-title">Email Broadcast Hub</h1>
                                <p class="admin-page-subtitle">Compose, schedule, and dispatch broadcast messages to members, board, or executive council.</p>
                            </div>
                            <button class="btn-primary" onclick="EmailHub.compose()">
                                <i class="fa-solid fa-feather mr-1.5"></i> Compose New
                            </button>
                        </div>

                        <!-- Stats -->
                        <div class="admin-stats-grid stagger-list">
                            ${window.AdminPanel.statCard('blue', 'fa-paper-plane', this.stats.sent_today, 'Sent Today')}
                            ${window.AdminPanel.statCard('green', 'fa-circle-check', this.stats.total_sent, 'Delivered (30d)')}
                            ${window.AdminPanel.statCard('yellow', 'fa-hourglass-half', this.stats.queued, 'In Queue')}
                            ${window.AdminPanel.statCard('red', 'fa-circle-exclamation', this.stats.failed, 'Failed')}
                        </div>

                        <!-- Templates -->
                        <div class="admin-panel mb-6">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Quick Templates</h3>
                                <span class="badge badge-blue">${Object.keys(this.templates).length} available</span>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    ${Object.entries(this.templates).map(([key, t]) => `
                                        <button class="quick-action-btn hover-lift" onclick="EmailHub.compose('${key}')">
                                            <i class="fa-solid ${t.icon} text-${t.color}-500"></i>
                                            <span>${t.label}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Drafts -->
                        ${this.drafts.length > 0 ? `
                            <div class="admin-panel mb-6" style="border-top: 3px solid #eab308 !important;">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title"><i class="fa-solid fa-floppy-disk text-yellow-500"></i> Saved Drafts</h3>
                                    <span class="badge badge-yellow">${this.drafts.length}</span>
                                </div>
                                <div class="admin-panel-body p-0">
                                    <div class="divide-y divide-slate-200/30 dark:divide-white/[0.03]">
                                        ${this.drafts.map((d, i) => `
                                            <div class="flex items-center gap-3 p-4 hover:bg-white/20 dark:hover:bg-slate-800/20 transition">
                                                <div class="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                                                    <i class="fa-solid fa-file-lines text-yellow-500 text-sm"></i>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-xs font-bold truncate">${window.AdminPanel.esc(d.subject || 'Untitled Draft')}</p>
                                                    <p class="text-[10px] text-slate-400">Saved ${window.AdminPanel.ago(d.saved_at)} &bull; ${d.recipient_type}</p>
                                                </div>
                                                <button class="btn-primary btn-xs" onclick="EmailHub.loadDraft(${i})">
                                                    <i class="fa-solid fa-pen"></i> Edit
                                                </button>
                                                <button class="btn-secondary btn-xs" onclick="EmailHub.deleteDraft(${i})">
                                                    <i class="fa-solid fa-trash-can"></i>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Transmission Log -->
                        <div class="admin-panel">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-tower-broadcast"></i> Transmission Log</h3>
                                <div class="flex items-center gap-2">
                                    <button class="btn-secondary btn-xs" onclick="EmailHub.exportLog()">
                                        <i class="fa-solid fa-file-csv mr-1"></i> Export
                                    </button>
                                    <button class="btn-secondary btn-xs" onclick="EmailHub.render(AdminPanel.workspace)">
                                        <i class="fa-solid fa-rotate"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="admin-panel-body p-0">
                                <div class="overflow-x-auto">
                                    <table class="admin-data-table">
                                        <thead>
                                            <tr>
                                                <th>Date & Time</th>
                                                <th>Type</th>
                                                <th>Subject</th>
                                                <th>Sender</th>
                                                <th>Recipients</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.recentEmails.length === 0
                                                ? `<tr><td colspan="7" class="text-center py-12 text-slate-400">
                                                    <i class="fa-solid fa-inbox text-2xl mb-2 block opacity-30"></i>
                                                    No broadcasts documented. Click "Compose New" to send your first email.
                                                </td></tr>`
                                                : this.recentEmails.map(e => `
                                                    <tr>
                                                        <td class="text-xs text-slate-500 whitespace-nowrap">${window.AdminPanel.fmtDate(e.created_at)}<br><span class="text-[10px] text-slate-400">${new Date(e.created_at).toLocaleTimeString()}</span></td>
                                                        <td><span class="badge badge-blue">${(e.email_type || 'generic').replace(/_/g, ' ')}</span></td>
                                                        <td class="text-xs font-bold truncate max-w-[200px]" title="${window.AdminPanel.esc(e.subject || '')}">${window.AdminPanel.esc(e.subject || 'No Subject')}</td>
                                                        <td class="text-xs text-slate-500">${window.AdminPanel.esc(e.sender_name || 'System')}</td>
                                                        <td class="text-xs font-bold">${e.recipient_count || 0}</td>
                                                        <td><span class="status-badge ${e.status}">${e.status}</span></td>
                                                        <td>
                                                            <button class="btn-secondary btn-xs" onclick="EmailHub.viewEmailDetail('${e.id}')" title="View Details">
                                                                <i class="fa-solid fa-eye"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error('EmailHub render error:', e);
                workspace.innerHTML = window.AdminPanel.renderError(e.message);
            }
        },

        // ==========================================
        // DATA LOADING
        // ==========================================
        async loadStats() {
            try {
                const today = new Date().toISOString().split('T')[0];
                const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();

                const [sentToday, totalSent, queued, failed] = await Promise.all([
                    window.DB_ADMIN.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', today),
                    window.DB_ADMIN.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', ago30),
                    window.DB_ADMIN.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
                    window.DB_ADMIN.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', ago30)
                ]);

                this.stats = {
                    sent_today: sentToday.count || 0,
                    total_sent: totalSent.count || 0,
                    queued: queued.count || 0,
                    failed: failed.count || 0
                };
            } catch (e) {
                console.warn('Email stats load failed:', e);
                this.stats = { sent_today: 0, total_sent: 0, queued: 0, failed: 0 };
            }
        },

        async loadRecent() {
            try {
                const { data } = await window.DB_ADMIN
                    .from('email_log')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(25);
                this.recentEmails = data || [];
            } catch (e) {
                this.recentEmails = [];
            }
        },

        loadDrafts() {
            try {
                const stored = localStorage.getItem('unity_email_drafts');
                this.drafts = stored ? JSON.parse(stored) : [];
            } catch (e) {
                this.drafts = [];
            }
        },

        saveDraftsToStorage() {
            localStorage.setItem('unity_email_drafts', JSON.stringify(this.drafts));
        },

        // ==========================================
        // COMPOSE MODAL
        // ==========================================
        async compose(templateKey) {
            const t = templateKey ? this.templates[templateKey] : null;
            this.currentTemplate = templateKey;

            // Pre-fetch recipient counts
            const [allCount, boardCount, execCount] = await Promise.all([
                this.getRecipientCount('all_members'),
                this.getRecipientCount('board'),
                this.getRecipientCount('executive')
            ]);

            window.AdminPanel.createModal({
                title: t ? `Compose: ${t.label}` : 'Compose Broadcast Email',
                size: 'wide',
                icon: 'envelope-open-text',
                body: `
                    <form id="email-compose-form" onsubmit="return false;" class="space-y-6">
                        <!-- Recipients -->
                        <div class="admin-panel">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-users"></i> Recipient Selection</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <label class="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue cursor-pointer transition-all bg-white/20 dark:bg-slate-800/10 recipient-option" data-type="all_members">
                                        <input type="radio" name="recipient_type" value="all_members" checked class="accent-brand-blue w-4 h-4">
                                        <div class="flex-1">
                                            <p class="text-xs font-extrabold">All Active Members</p>
                                            <p class="text-[10px] text-slate-400 mt-0.5">Every registered active member</p>
                                        </div>
                                        <span class="badge badge-blue">${allCount}</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue cursor-pointer transition-all bg-white/20 dark:bg-slate-800/10 recipient-option" data-type="board">
                                        <input type="radio" name="recipient_type" value="board" class="accent-brand-blue w-4 h-4">
                                        <div class="flex-1">
                                            <p class="text-xs font-extrabold">Board Members</p>
                                            <p class="text-[10px] text-slate-400 mt-0.5">Board of Directors only</p>
                                        </div>
                                        <span class="badge badge-purple">${boardCount}</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue cursor-pointer transition-all bg-white/20 dark:bg-slate-800/10 recipient-option" data-type="executive">
                                        <input type="radio" name="recipient_type" value="executive" class="accent-brand-blue w-4 h-4">
                                        <div class="flex-1">
                                            <p class="text-xs font-extrabold">Executive Council</p>
                                            <p class="text-[10px] text-slate-400 mt-0.5">Pres, VP, Sec, Treas, Advisor</p>
                                        </div>
                                        <span class="badge badge-green">${execCount}</span>
                                    </label>
                                </div>
                                <div class="mt-3 flex items-center gap-2">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="custom-recipients-toggle" class="w-4 h-4 accent-brand-blue" onchange="EmailHub.toggleCustomRecipients()">
                                        <span class="text-xs font-bold">Add custom CC recipients</span>
                                    </label>
                                </div>
                                <div id="custom-recipients-container" class="hidden mt-3">
                                    <input type="text" name="custom_emails" class="admin-form-input" placeholder="email1@example.com, email2@example.com">
                                    <span class="admin-form-hint">Comma-separated email addresses to CC</span>
                                </div>
                            </div>
                        </div>

                        <!-- Subject -->
                        <div class="admin-form-group">
                            <label class="admin-form-label">Subject Line <span class="required">*</span></label>
                            <input type="text" name="subject" required class="admin-form-input text-sm font-bold"
                                value="${window.AdminPanel.esc(t?.subject || '')}"
                                placeholder="e.g. Important: Annual General Meeting Notice">
                        </div>

                        <!-- Body -->
                        <div class="admin-form-group">
                            <label class="admin-form-label">Email Content (HTML) <span class="required">*</span></label>
                            <div class="flex gap-2 mb-2 flex-wrap">
                                <button type="button" class="btn-secondary btn-xs" onclick="EmailHub.insertTag('bold')"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" class="btn-secondary btn-xs" onclick="EmailHub.insertTag('italic')"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" class="btn-secondary btn-xs" onclick="EmailHub.insertTag('link')"><i class="fa-solid fa-link"></i></button>
                                <button type="button" class="btn-secondary btn-xs" onclick="EmailHub.insertTag('list')"><i class="fa-solid fa-list"></i></button>
                                <button type="button" class="btn-secondary btn-xs" onclick="EmailHub.insertTag('heading')"><i class="fa-solid fa-heading"></i></button>
                                <button type="button" class="btn-secondary btn-xs" onclick="EmailHub.insertTag('divider')"><i class="fa-solid fa-minus"></i></button>
                            </div>
                            <textarea name="html_body" required rows="16" class="admin-form-input admin-form-textarea font-mono text-[11px] leading-relaxed"
                                placeholder="Enter your HTML email content here...">${t?.body || ''}</textarea>
                            <span class="admin-form-hint">Full HTML supported. Use inline CSS for best compatibility across email clients.</span>
                        </div>

                        <!-- Options -->
                        <div class="admin-panel">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-sliders"></i> Delivery Options</h3>
                            </div>
                            <div class="admin-panel-body">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] cursor-pointer bg-white/20 dark:bg-slate-800/10">
                                        <input type="checkbox" name="send_test_first" class="w-4 h-4 accent-brand-blue">
                                        <div>
                                            <p class="text-xs font-bold">Send test copy to myself first</p>
                                            <p class="text-[10px] text-slate-400">Verify formatting before broadcast</p>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.08] cursor-pointer bg-white/20 dark:bg-slate-800/10">
                                        <input type="checkbox" name="track_opens" checked class="w-4 h-4 accent-green-500">
                                        <div>
                                            <p class="text-xs font-bold">Track delivery status</p>
                                            <p class="text-[10px] text-slate-400">Log send status in email_log</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="AdminPanel.closeModal()">Discard</button>
                    <button class="btn-secondary" onclick="EmailHub.saveDraft()">
                        <i class="fa-solid fa-floppy-disk mr-1"></i> Save Draft
                    </button>
                    <button class="btn-secondary" onclick="EmailHub.preview()">
                        <i class="fa-solid fa-eye mr-1"></i> Preview
                    </button>
                    <button class="btn-primary" onclick="EmailHub.send()" id="email-send-btn">
                        <i class="fa-solid fa-paper-plane mr-1.5"></i> Dispatch Broadcast
                    </button>
                `
            });

            // Highlight selected recipient
            setTimeout(() => {
                document.querySelectorAll('.recipient-option').forEach(opt => {
                    const radio = opt.querySelector('input[type="radio"]');
                    if (radio?.checked) opt.style.borderColor = 'rgba(26,115,232,0.4)';
                    radio?.addEventListener('change', () => {
                        document.querySelectorAll('.recipient-option').forEach(o => o.style.borderColor = '');
                        opt.style.borderColor = 'rgba(26,115,232,0.4)';
                    });
                });
            }, 100);
        },

        // ==========================================
        // RECIPIENT HELPERS
        // ==========================================
        async getRecipientCount(type) {
            try {
                let q = window.DB_ADMIN.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
                if (type === 'board') q = q.eq('is_board_member', true);
                else if (type === 'executive') q = q.in('role', ['advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer']);
                const { count } = await q;
                return count || 0;
            } catch (e) { return 0; }
        },

        async getRecipients(type) {
            try {
                // Members / Board: ONE mail to the group address saved in Admin > Settings
                if ((type === 'all_members' || type === 'board') && window.getMailGroups) {
                    const g = await window.getMailGroups();
                    return [{ email: type === 'board' ? g.board : g.members, full_name: type === 'board' ? 'Board Members Group' : 'All Members Group' }];
                }
                let q = window.DB_ADMIN.from('users').select('email, full_name').eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
                if (type === 'board') q = q.eq('is_board_member', true);
                else if (type === 'executive') q = q.in('role', ['advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer']);
                const { data } = await q;
                return (data || []).filter(u => u.email && u.email.includes('@'));
            } catch (e) { return []; }
        },

        toggleCustomRecipients() {
            const container = document.getElementById('custom-recipients-container');
            const toggle = document.getElementById('custom-recipients-toggle');
            if (container && toggle) {
                container.classList.toggle('hidden', !toggle.checked);
            }
        },

        // ==========================================
        // HTML INSERTION HELPERS
        // ==========================================
        insertTag(type) {
            const textarea = document.querySelector('[name="html_body"]');
            if (!textarea) return;

            const tags = {
                bold: '<strong>bold text</strong>',
                italic: '<em>italic text</em>',
                link: '<a href="https://" style="color:#1a73e8;">link text</a>',
                list: '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>',
                heading: '<h2 style="color:#1a73e8;">Heading</h2>',
                divider: '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">'
            };

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const insert = tags[type] || '';

            textarea.value = text.substring(0, start) + insert + text.substring(end);
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + insert.length;
        },

        // ==========================================
        // PREVIEW
        // ==========================================
        preview() {
            const form = document.getElementById('email-compose-form');
            if (!form) return;

            const subject = form.querySelector('[name="subject"]').value || 'No Subject';
            const body = form.querySelector('[name="html_body"]').value || '<p>No content</p>';

            const previewWindow = window.open('', '_blank', 'width=650,height=850,scrollbars=yes');
            previewWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Email Preview: ${subject}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Poppins', system-ui, sans-serif; background: #f1f5f9; padding: 24px; }
                        .toolbar { background: #1e293b; color: white; padding: 12px 20px; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
                        .toolbar .close-btn { background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 11px; }
                        .meta { background: white; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
                        .meta strong { color: #1e293b; }
                        .content { background: white; padding: 0; border-radius: 0 0 12px 12px; overflow: hidden; }
                    </style>
                </head>
                <body>
                    <div class="toolbar">
                        <span>📧 Email Preview Mode</span>
                        <button class="close-btn" onclick="window.close()">Close Preview</button>
                    </div>
                    <div class="meta">
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p style="margin-top:4px;"><strong>From:</strong> Rotaract Unity Portal &lt;rc.cbeunity@gmail.com&gt;</p>
                    </div>
                    <div class="content">${body}</div>
                </body>
                </html>
            `);
            previewWindow.document.close();
        },

        // ==========================================
        // SEND
        // ==========================================
        async send() {
            const form = document.getElementById('email-compose-form');
            if (!form) return;

            const fd = new FormData(form);
            const subject = fd.get('subject')?.trim();
            const htmlBody = fd.get('html_body')?.trim();
            const recipientType = fd.get('recipient_type');
            const customEmails = fd.get('custom_emails')?.trim();
            const sendTestFirst = fd.get('send_test_first') === 'on';

            if (!subject) { window.AppToast?.warning('Subject line is required.'); return; }
            if (!htmlBody) { window.AppToast?.warning('Email body content is required.'); return; }

            try {
                // Gather recipients
                let recipients = await this.getRecipients(recipientType);
                let recipientEmails = recipients.map(r => r.email);

                // Add custom CC
                if (customEmails) {
                    const custom = customEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'));
                    recipientEmails = [...new Set([...recipientEmails, ...custom])];
                }

                if (recipientEmails.length === 0) {
                    window.AppToast?.warning('No valid recipients found for the selected group.');
                    return;
                }

                if (!confirm(
                    `📧 Dispatch Broadcast\n\n` +
                    `Subject: ${subject}\n` +
                    `Recipients: ${recipientEmails.length <= 3 ? recipientEmails.join(', ') : recipientEmails.length + ' addresses'}\n` +
                    `Group: ${recipientType}\n\n` +
                    `Proceed with sending?`
                )) return;

                const sendBtn = document.getElementById('email-send-btn');
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Dispatching...';
                }

                const sender = window.AuthManager.currentUser;

                // Log to email_log
                const { data: logEntry, error: logError } = await window.DB_ADMIN
                    .from('email_log')
                    .insert({
                        email_type: this.currentTemplate || 'broadcast',
                        subject: subject,
                        html_body: htmlBody,
                        sender_id: sender.id,
                        sender_name: sender.full_name || sender.name,
                        sender_role: sender.role,
                        recipient_emails: recipientEmails,
                        recipient_count: recipientEmails.length,
                        status: 'sending'
                    })
                    .select()
                    .single();

                if (logError) throw logError;

                // Send test first if requested
                if (sendTestFirst && sender.email) {
                    try {
                        await postToScript({
                            type: 'test',
                            recipients: [sender.email],
                            subject: `[TEST] ${subject}`,
                            html_body: htmlBody,
                            sender: { role: sender.role, name: sender.full_name || sender.name, email: sender.email }
                        });
                        window.AppToast?.info('📬 Test copy sent to your inbox.');
                    } catch (testErr) {
                        console.warn('Test email failed:', testErr);
                    }
                }

                // Dispatch via the Apps Script mail service
                try {
                    const result = await postToScript({
                        type: this.currentTemplate || 'broadcast',
                        recipients: recipientEmails,
                        subject: subject,
                        html_body: htmlBody,
                        sender: {
                            role: sender.role,
                            name: sender.full_name || sender.name,
                            email: sender.email
                        }
                    });

                    if (result.success) {
                        await window.DB_ADMIN
                            .from('email_log')
                            .update({
                                status: 'sent',
                                sent_at: new Date().toISOString(),
                                recipient_count: result.recipients_count || recipientEmails.length
                            })
                            .eq('id', logEntry.id);

                        window.AppToast?.success(`✅ Broadcast sent to ${recipientEmails.length <= 3 ? recipientEmails.join(', ') : recipientEmails.length + ' recipients'}.`);
                    } else {
                        throw new Error(result.error || 'Mail service returned a failure');
                    }
                } catch (sendErr) {
                    await window.DB_ADMIN
                        .from('email_log')
                        .update({
                            status: 'failed',
                            error_message: sendErr.message
                        })
                        .eq('id', logEntry.id);
                    throw sendErr;
                }

                // Log activity
                await window.AdminPanel.logActivity('EMAIL_BROADCAST', 'email_log', logEntry.id, {
                    subject: subject,
                    recipients: recipientEmails.length,
                    type: this.currentTemplate || 'broadcast'
                });

                window.AdminPanel.closeModal();
                await this.render(window.AdminPanel.workspace);

            } catch (e) {
                console.error('Email send failed:', e);
                window.AppToast?.error('Broadcast failed: ' + e.message);
            } finally {
                const sendBtn = document.getElementById('email-send-btn');
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1.5"></i> Dispatch Broadcast';
                }
            }
        },

        // ==========================================
        // DRAFTS
        // ==========================================
        saveDraft() {
            const form = document.getElementById('email-compose-form');
            if (!form) return;

            const fd = new FormData(form);
            const draft = {
                subject: fd.get('subject') || '',
                html_body: fd.get('html_body') || '',
                recipient_type: fd.get('recipient_type') || 'all_members',
                custom_emails: fd.get('custom_emails') || '',
                template: this.currentTemplate,
                saved_at: new Date().toISOString()
            };

            this.drafts.unshift(draft);
            if (this.drafts.length > 10) this.drafts = this.drafts.slice(0, 10);
            this.saveDraftsToStorage();

            window.AppToast?.success('💾 Draft saved to local storage.');
        },

        loadDraft(index) {
            const draft = this.drafts[index];
            if (!draft) return;

            window.AdminPanel.closeModal();

            setTimeout(() => {
                this.compose(draft.template);

                setTimeout(() => {
                    const form = document.getElementById('email-compose-form');
                    if (!form) return;

                    if (draft.subject) form.querySelector('[name="subject"]').value = draft.subject;
                    if (draft.html_body) form.querySelector('[name="html_body"]').value = draft.html_body;
                    if (draft.recipient_type) {
                        const radio = form.querySelector(`[name="recipient_type"][value="${draft.recipient_type}"]`);
                        if (radio) radio.checked = true;
                    }
                    if (draft.custom_emails) {
                        const toggle = document.getElementById('custom-recipients-toggle');
                        const container = document.getElementById('custom-recipients-container');
                        if (toggle && container) {
                            toggle.checked = true;
                            container.classList.remove('hidden');
                            form.querySelector('[name="custom_emails"]').value = draft.custom_emails;
                        }
                    }

                    window.AppToast?.info('📝 Draft loaded into composer.');
                }, 200);
            }, 300);
        },

        deleteDraft(index) {
            if (!confirm('Delete this draft?')) return;
            this.drafts.splice(index, 1);
            this.saveDraftsToStorage();
            window.AppToast?.success('Draft deleted.');
            this.render(window.AdminPanel.workspace);
        },

        // ==========================================
        // VIEW EMAIL DETAIL
        // ==========================================
        async viewEmailDetail(logId) {
            try {
                const { data: email } = await window.DB_ADMIN
                    .from('email_log')
                    .select('*')
                    .eq('id', logId)
                    .single();

                if (!email) { window.AppToast?.warning('Email record not found.'); return; }

                const recipients = email.recipient_emails || [];
                const showRecipients = recipients.slice(0, 20);

                window.AdminPanel.createModal({
                    title: 'Transmission Detail',
                    size: 'wide',
                    icon: 'envelope-open',
                    body: `
                        <div class="space-y-5">
                            <!-- Header Info -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Status</p>
                                    <p class="mt-1"><span class="status-badge ${email.status}">${email.status}</span></p>
                                </div>
                                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Type</p>
                                    <p class="text-xs font-bold mt-1">${(email.email_type || 'generic').replace(/_/g, ' ')}</p>
                                </div>
                                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Recipients</p>
                                    <p class="text-xs font-bold mt-1">${email.recipient_count || recipients.length}</p>
                                </div>
                                <div class="p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10 dark:border-white/[0.03]">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Sent At</p>
                                    <p class="text-xs font-bold mt-1">${email.sent_at ? window.AdminPanel.fmtDate(email.sent_at) : 'N/A'}</p>
                                </div>
                            </div>

                            <!-- Subject -->
                            <div class="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
                                <p class="text-[10px] text-slate-400 uppercase font-bold">Subject</p>
                                <p class="text-sm font-extrabold mt-1">${window.AdminPanel.esc(email.subject || 'No Subject')}</p>
                            </div>

                            <!-- Sender -->
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                    <i class="fa-solid fa-user text-brand-blue text-xs"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold">${window.AdminPanel.esc(email.sender_name || 'System')}</p>
                                    <p class="text-[10px] text-slate-400">${(email.sender_role || '').replace(/_/g, ' ')} &bull; ${window.AdminPanel.fmtDate(email.created_at)}</p>
                                </div>
                            </div>

                            <!-- Recipients List -->
                            <div class="admin-panel">
                                <div class="admin-panel-header">
                                    <h3 class="admin-panel-title"><i class="fa-solid fa-users"></i> Recipient List</h3>
                                    <span class="badge badge-blue">${recipients.length} total</span>
                                </div>
                                <div class="admin-panel-body" style="max-height:200px;overflow-y:auto;">
                                    ${recipients.length === 0 ? '<p class="text-xs text-slate-400">No recipients recorded</p>' : `
                                        <div class="flex flex-wrap gap-2">
                                            ${showRecipients.map(r => `<span class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">${typeof r === 'string' ? r : r.email || r}</span>`).join('')}
                                            ${recipients.length > 20 ? `<span class="px-2 py-1 rounded-lg bg-brand-blue/10 text-[10px] font-bold text-brand-blue">+${recipients.length - 20} more</span>` : ''}
                                        </div>
                                    `}
                                </div>
                            </div>

                            <!-- Error Message -->
                            ${email.error_message ? `
                                <div class="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                                    <p class="text-[10px] text-red-500 uppercase font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i>Error</p>
                                    <p class="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">${window.AdminPanel.esc(email.error_message)}</p>
                                </div>
                            ` : ''}

                            <!-- Preview -->
                            ${email.html_body ? `
                                <div class="admin-panel">
                                    <div class="admin-panel-header">
                                        <h3 class="admin-panel-title"><i class="fa-solid fa-eye"></i> Email Preview</h3>
                                        <button class="btn-secondary btn-xs" onclick="EmailHub.previewSentEmail('${email.id}')">
                                            <i class="fa-solid fa-external-link mr-1"></i> Open Full
                                        </button>
                                    </div>
                                    <div class="admin-panel-body p-0">
                                        <iframe srcdoc="${window.AdminPanel.esc(email.html_body)}" 
                                            style="width:100%;height:300px;border:none;border-radius:0 0 20px 20px;" 
                                            sandbox="allow-same-origin"></iframe>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `
                });
            } catch (e) {
                window.AppToast?.error('Failed to load email details: ' + e.message);
            }
        },

        previewSentEmail(logId) {
            const email = this.recentEmails.find(e => e.id === logId);
            if (!email || !email.html_body) return;

            const w = window.open('', '_blank', 'width=650,height=850');
            w.document.write(`
                <!DOCTYPE html><html><head><title>${email.subject}</title>
                <style>body{font-family:system-ui,sans-serif;padding:24px;background:#f1f5f9;}</style>
                </head><body>${email.html_body}</body></html>
            `);
            w.document.close();
        },

        // ==========================================
        // EXPORT
        // ==========================================
        exportLog() {
            if (!this.recentEmails.length) {
                window.AppToast?.warning('No email logs to export.');
                return;
            }

            const headers = ['Date', 'Type', 'Subject', 'Sender', 'Recipients', 'Status', 'Error'];
            const rows = this.recentEmails.map(e => [
                e.created_at,
                e.email_type || 'generic',
                (e.subject || '').replace(/,/g, ';'),
                e.sender_name || 'System',
                e.recipient_count || 0,
                e.status,
                (e.error_message || '').replace(/,/g, ';')
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unity_email_log_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            window.AppToast?.success('Email log exported!');
        }
    };

    // Expose globally
    window.EmailHub = EmailHub;
})();
