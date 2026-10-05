// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Secure Authentication & Role-Based Access Control
// File: js/auth.js | Version: 12.0.0
// ============================================

(function () {
    'use strict';

    const SESSION_KEY = 'unity_secure_session';
    const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 Hours Session Lifetime

    // ==========================================
    // REGISTERED USER DIRECTORY
    // ==========================================
    const USER_DIRECTORY = [
        {
            id: 'usr-01',
            email: 'rc.cbeunity@gmail.com',
            password: 'Unity@91594',
            name: 'Super Adminstrator',
            role: 'super_admin',
            portfolio: 'System Administrator',
            avenue: null,
            isBoardMember: false,   // system account, not a club member
            photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-01'
        },
        {
            id: 'usr-02',
            email: 'president@unity.org',
            password: 'pres3206',
            name: 'Rtr. Siddharth Roy',
            role: 'president',
            portfolio: 'Club President',
            avenue: null,
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-01'
        },
        {
            id: 'usr-03',
            email: 'secretary@unity.org',
            password: 'sec3206',
            name: 'Rtr. Meera Nair',
            role: 'secretary',
            portfolio: 'Club Secretary',
            avenue: null,
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-02'
        },
        {
            id: 'usr-04',
            email: 'treasurer@unity.org',
            password: 'treas3206',
            name: 'Rtr. Rahul Dev',
            role: 'treasurer',
            portfolio: 'Club Treasurer',
            avenue: null,
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-03'
        },
        {
            id: 'usr-05',
            email: 'advisor@unity.org',
            password: 'adv3206',
            name: 'Rtr. Harish Kumar',
            role: 'advisor',
            portfolio: 'Club Advisor',
            avenue: null,
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-04'
        },
        {
            id: 'usr-06',
            email: 'vp@unity.org',
            password: 'vp3206',
            name: 'Rtr. Priya Sharma',
            role: 'vice_president',
            portfolio: 'Vice President',
            avenue: null,
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-05'
        },
        {
            id: 'usr-07',
            email: 'community@unity.org',
            password: 'comm3206',
            name: 'Rtr. Kaviya Selvam',
            role: 'avenue_director',
            portfolio: 'Community Service Director',
            avenue: 'community_service',
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-06'
        },
        {
            id: 'usr-08',
            email: 'professional@unity.org',
            password: 'prof3206',
            name: 'Rtr. Dinesh Karthik',
            role: 'avenue_director',
            portfolio: 'Professional Service Director',
            avenue: 'professional_service',
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-07'
        },
        {
            id: 'usr-09',
            email: 'dpp@unity.org',
            password: 'dpp3206',
            name: 'Rtr. Sanjay Dev',
            role: 'dpp_chair',
            portfolio: 'District Priority Project Chair',
            avenue: 'dpp',
            isBoardMember: true,
            photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-08'
        },
        {
            id: 'usr-10',
            email: 'blood@unity.org',
            password: 'blood3206',
            name: 'Rtr. Sophia Jennifer',
            role: 'blood_donor_chair',
            portfolio: 'Blood Donor Desk Chair',
            avenue: null,
            isBoardMember: false,
            photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
            riId: 'RI-91594-09'
        }
    ];

    // ==========================================
    // GLOBAL HELPER PREDICATES (used by RBAC logic)
    // ==========================================
    window.isExecutiveRole = function (role) {
        const execRoles = ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer'];
        return execRoles.includes(role);
    };

    window.isSecretaryRole = function (role) {
        return ['secretary', 'secretary_admin', 'secretary_comm'].includes(role);
    };

    window.canApprove = function (role) {
        return ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm'].includes(role);
    };

    window.canAccessTreasury = function (role, fullAccess) {
        if (fullAccess) {
            return ['super_admin', 'advisor', 'president', 'treasurer'].includes(role);
        }
        return ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer'].includes(role);
    };

    window.formatRoleName = function (role) {
        if (!role) return 'Member';
        return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Expose uploader fallback for profile pictures
    if (!window.Uploader) window.Uploader = {};
    if (!window.Uploader.getThumbnailUrl) {
        window.Uploader.getThumbnailUrl = function (url) {
            return url || '';
        };
    }

    // Toast notification fallback
    if (!window.AppToast) {
        window.AppToast = {
            success: function (msg) { 
                console.log('[SUCCESS]', msg); 
                try { 
                    if (window.AdminPanel && window.AdminPanel.notify) window.AdminPanel.notify('success', msg); 
                    else alert('✓ ' + msg); 
                } catch (e) { alert('✓ ' + msg); } 
            },
            error: function (msg) { 
                console.error('[ERROR]', msg); 
                try { 
                    if (window.AdminPanel && window.AdminPanel.notify) window.AdminPanel.notify('error', msg); 
                    else alert('✗ ' + msg); 
                } catch (e) { alert('✗ ' + msg); } 
            },
            warning: function (msg) { 
                console.warn('[WARNING]', msg); 
                try { 
                    if (window.AdminPanel && window.AdminPanel.notify) window.AdminPanel.notify('warning', msg); 
                    else alert('⚠ ' + msg); 
                } catch (e) { alert('⚠ ' + msg); } 
            },
            info: function (msg) { 
                console.info('[INFO]', msg); 
                try { 
                    if (window.AdminPanel && window.AdminPanel.notify) window.AdminPanel.notify('info', msg); 
                    else alert('ℹ ' + msg); 
                } catch (e) { alert('ℹ ' + msg); } 
            }
        };
    }

    // UnityDB: events -> public.events, treasury -> public.treasury; other keys stay in localStorage
    (function () {
        'use strict';
    
        const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUuid = v => typeof v === 'string' && UUID.test(v);
        const uuidOrNull = v => (isUuid(v) ? v : null);
        const str = v => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
        const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const first = (...v) => v.find(x => x !== undefined && x !== null);
        // Resolved at call time because app.js creates the clients after this file loads.
        const client = () => window.DB_ADMIN || window.DB;
        const todayISO = () => new Date().toISOString().slice(0, 10);
    
        const CONFIG = {
            projects: {
                table: 'events',
                order: [['date', false]],
                fromRow: r => ({
                    ...r,
                    name: r.event_name, desc: r.description, avenue: r.avenue_slug,
                    chair: r.event_chair, proposer: r.event_proposed_by, seconder: r.event_seconded_by,
                    poster: r.poster_url, colab: r.collaborator_name,
                    type: r.date >= todayISO() ? 'upcoming' : 'completed'
                }),
                toRow: p => ({
                    event_name: str(first(p.event_name, p.name)),
                    description: str(first(p.description, p.desc)),
                    date: str(p.date),
                    start_time: str(p.start_time), end_time: str(p.end_time), venue: str(p.venue),
                    avenue_id: uuidOrNull(p.avenue_id),
                    avenue_slug: str(first(p.avenue_slug, p.avenue)),
                    event_chair: str(first(p.event_chair, p.chair)),
                    event_secretary: str(p.event_secretary),
                    event_proposed_by: str(first(p.event_proposed_by, p.proposer)),
                    event_seconded_by: str(first(p.event_seconded_by, p.seconder)),
                    poster_url: str(first(p.poster_url, p.poster)),
                    poster_public_id: str(p.poster_public_id),
                    poster_provider: str(p.poster_provider) || 'cloudinary',
                    collaborator_name: str(first(p.collaborator_name, p.colab)),
                    collaboration_type: str(p.collaboration_type),
                    has_collaboration: !!str(first(p.collaborator_name, p.colab)),
                    is_dpp: !!p.is_dpp,
                    dpp_project_number: str(p.dpp_project_number),
                    dpp_pillar: str(p.dpp_pillar),
                    dpp_category: str(p.dpp_category),
                    pillar_alignment_reason: str(p.pillar_alignment_reason),
                    dpp_sdg_goals: str(p.dpp_sdg_goals),
                    dpp_target_group: str(p.dpp_target_group),
                    dpp_impact_metric: str(p.dpp_impact_metric),
                    dpp_sustainability_plan: str(p.dpp_sustainability_plan),
                    group_number: str(p.group_number),
                    status: str(p.status) || 'draft',
                    report_text: str(p.report_text),
                    report_submitted: !!p.report_submitted,
                    beneficiaries_count: Math.round(num(p.beneficiaries_count)),
                    volunteers_count: Math.round(num(p.volunteers_count)),
                    service_hours: num(p.service_hours),
                    amount_spent: num(p.amount_spent),
                    approved_by: uuidOrNull(p.approved_by),
                    created_by: uuidOrNull(p.created_by)
                })
            },
            treasury: {
                table: 'treasury',
                order: [['transaction_date', true], ['created_at', true]],
                fromRow: r => ({ ...r, income: num(r.income), expense: num(r.expense), balance: num(r.balance) }),
                // balance is computed by the update_treasury_balance trigger, so it is never written.
                toRow: t => ({
                    transaction_date: str(t.transaction_date),
                    particular: str(t.particular),
                    description: str(t.description),
                    category: str(t.category),
                    income: num(t.income),
                    expense: num(t.expense),
                    receipt_url: str(t.receipt_url),
                    receipt_public_id: str(t.receipt_public_id),
                    receipt_provider: str(t.receipt_provider) || 'supabase',
                    event_id: uuidOrNull(t.event_id),
                    approved: !!t.approved,
                    approved_by: uuidOrNull(t.approved_by),
                    created_by: uuidOrNull(t.created_by)
                })
            }
        };
    
        function makeStore(cfg) {
            let snap = new Map();
            let loaded = false;
    
            async function load() {
                const c = client();
                if (!c) throw new Error('Supabase is not ready yet. Reload the page and try again.');
                let q = c.from(cfg.table).select('*');
                cfg.order.forEach(([col, asc]) => { q = q.order(col, { ascending: asc }); });
                const { data, error } = await q;
                if (error) throw new Error(`Could not load ${cfg.table}: ${error.message}`);
                snap = new Map(data.map(r => [r.id, JSON.stringify(cfg.toRow(r))]));
                loaded = true;
                return data.map(cfg.fromRow);
            }
    
            async function save(list) {
                const c = client();
                if (!c) throw new Error('Supabase is not ready yet. Reload the page and try again.');
                if (!Array.isArray(list)) throw new Error(`Expected a list for ${cfg.table}.`);
                if (!loaded) await load();
                // Guard against wiping a table because an earlier read failed upstream.
                if (list.length === 0 && snap.size > 1) {
                    throw new Error(`Refused to delete all rows in ${cfg.table}. Reload and try again.`);
                }
    
                const keep = new Set();
                for (const item of list) {
                    const row = cfg.toRow(item);
                    if (isUuid(item.id) && snap.has(item.id)) {
                        keep.add(item.id);
                        if (snap.get(item.id) === JSON.stringify(row)) continue;
                        const { error } = await c.from(cfg.table).update(row).eq('id', item.id);
                        if (error) throw new Error(`Could not update ${cfg.table}: ${error.message}`);
                    } else {
                        // New rows (including legacy 'p-123' / 'txn-123' ids) get a database-generated uuid.
                        const { error } = await c.from(cfg.table).insert(row);
                        if (error) throw new Error(`Could not save to ${cfg.table}: ${error.message}`);
                    }
                }
                const removed = [...snap.keys()].filter(id => !keep.has(id));
                if (removed.length) {
                    const { error } = await c.from(cfg.table).delete().in('id', removed);
                    if (error) throw new Error(`Could not delete from ${cfg.table}: ${error.message}`);
                }
                return load();
            }
    
            return { load, save };
        }
    
        const stores = {};
        Object.keys(CONFIG).forEach(k => { stores[k] = makeStore(CONFIG[k]); });
    
        const legacy = {
            get(key, fallback) {
                try { return JSON.parse(localStorage.getItem('unity_' + key)) ?? fallback; } catch (e) { return fallback; }
            },
            set(key, val) {
                try { localStorage.setItem('unity_' + key, JSON.stringify(val)); } catch (e) { console.warn('[UnityDB] storage full', e); }
                return val;
            }
        };
    
        window.UnityDB = {
            async get(key, fallback) {
                const s = stores[key];
                if (!s) return legacy.get(key, fallback);
                if (!client()) return fallback !== undefined ? fallback : [];
                return s.load();
            },
            async set(key, val) {
                const s = stores[key];
                if (!s) return legacy.set(key, val);
                return s.save(val);
            }
        };
    })();

    // Admin portal opener helper
    window.openAdminPortal = window.openAdminPortal || function () {
        const portalModal = document.getElementById('admin-portal-modal');
        if (portalModal) {
            portalModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (window.AdminPanel && window.AdminPanel.init) {
                window.AdminPanel.init();
            }
        }
    };

    // ==========================================
    // CORE AUTH MANAGER
    // ==========================================
    const AuthManager = {
        currentUser: null,

        // ==========================================
        // 1. INITIALIZATION & SESSION RESTORE
        // ==========================================
        async init() {
            this.restoreSession();
            this.bindAuthForm();
            this.bindPortalTriggers();
            this.updateUIPermissions();
        },

        restoreSession() {
            try {
                const encryptedData = localStorage.getItem(SESSION_KEY);
                if (!encryptedData) {
                    this.currentUser = null;
                    return;
                }

                const session = JSON.parse(encryptedData);
                if (Date.now() > session.expiresAt) {
                    this.clearSession();
                    return;
                }

                this.currentUser = session.user;
                // Extend session lifetime on active load
                this.saveSession(this.currentUser);
                this.syncProfileUI();
            } catch (e) {
                console.error('Session restoration failed:', e);
                this.clearSession();
            }
        },

        saveSession(user) {
            const session = {
                user: user,
                expiresAt: Date.now() + SESSION_TTL_MS
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            this.currentUser = user;
        },

        clearSession() {
            localStorage.removeItem(SESSION_KEY);
            this.currentUser = null;
        },

        // ==========================================
        // 2. SECURE LOGIN PIPELINE
        // ==========================================
        async login(email, password) {
            if (!email || !password) {
                window.AppToast.warning('Email and password are required.');
                return false;
            }

            try {
                const cleanEmail = String(email).toLowerCase().trim();
                let resolvedUser = null;

                // 1) Admins created in the portal live in the `users` table.
                //    The password is verified server-side by the verify_user_login() function.
                const dbClient = window.DB_ADMIN || window.DB;
                if (dbClient && typeof dbClient.rpc === 'function') {
                    const { data: rows, error: rpcError } = await dbClient.rpc('verify_user_login', {
                        p_email: cleanEmail,
                        p_password: password
                    });
                    if (rpcError) {
                        console.warn('[Auth] verify_user_login unavailable, using built-in directory only:', rpcError.message);
                    } else {
                        const row = Array.isArray(rows) ? rows[0] : rows;
                        if (row && row.id) {
                            resolvedUser = {
                                id: row.id,
                                email: row.email,
                                name: row.full_name,
                                role: row.role,
                                avenue: row.avenue || null,
                                portfolio: row.portfolio || '',
                                isBoardMember: row.role !== 'super_admin' && !!row.is_board_member,
                                photoUrl: row.photo_url || '',
                                riId: row.ri_id || ''
                            };
                        }
                    }
                }

                // 2) Fall back to the built-in directory (original super admin etc.)
                if (!resolvedUser) {
                    const matchedAccount = USER_DIRECTORY.find(u =>
                        u.email.toLowerCase() === cleanEmail && u.password === password
                    );
                    if (matchedAccount) {
                        resolvedUser = {
                            id: matchedAccount.id,
                            email: matchedAccount.email,
                            name: matchedAccount.name,
                            role: matchedAccount.role,
                            avenue: matchedAccount.avenue,
                            portfolio: matchedAccount.portfolio,
                            isBoardMember: matchedAccount.isBoardMember,
                            photoUrl: matchedAccount.photoUrl,
                            riId: matchedAccount.riId
                        };
                    }
                }

                if (!resolvedUser) {
                    window.AppToast.error('Invalid credentials or inactive account.');
                    this.logActivity(null, 'LOGIN_FAILED', 'users', null, { email: cleanEmail });
                    return false;
                }

                this.saveSession(resolvedUser);
                this.syncProfileUI();
                this.updateUIPermissions();

                // Close login dialog
                const authModal = document.getElementById('auth-dialog-modal');
                if (authModal) {
                    authModal.classList.add('hidden');
                    document.body.style.overflow = '';
                }

                window.AppToast.success('Welcome back, ' + resolvedUser.name + '!');
                
                // Track visual activity
                this.logActivity(resolvedUser.id, 'LOGIN_SUCCESS', 'users', resolvedUser.id);

                // Auto-launch Admin workspace
                if (window.openAdminPortal) {
                    setTimeout(() => window.openAdminPortal(), 300);
                }

                return true;
            } catch (e) {
                console.error('Login process error:', e);
                window.AppToast.error('Authentication engine encountered an error: ' + e.message);
                return false;
            }
        },

        logout() {
            if (this.currentUser) {
                this.logActivity(this.currentUser.id, 'LOGOUT', 'users', this.currentUser.id);
            }
            this.clearSession();
            this.syncProfileUI();
            this.updateUIPermissions();
            
            // Close portal if open
            const portal = document.getElementById('admin-portal-modal');
            if (portal) {
                portal.classList.add('hidden');
                document.body.style.overflow = '';
            }
            
            // Full page reload for memory cleanup
            setTimeout(() => {
                window.location.reload();
            }, 500);
        },

        isLoggedIn() {
            return this.currentUser !== null;
        },

        // ==========================================
        // 3. GRANULAR RBAC ACCESS CONTROL
        // ==========================================
        hasAccess(action, metadata) {
            if (!this.currentUser) return false;

            const role = this.currentUser.role;
            const avenue = this.currentUser.avenue;

            // Super Admin and Advisor get absolute access bypass
            if (role === 'super_admin' || role === 'advisor') {
                return true;
            }

            // President and IPP get full access except for system modifications
            if (role === 'president' || role === 'ipp') {
                if (action === 'super_admin_only') return false;
                return true;
            }

            switch (action) {
                case 'create_event':
                case 'edit_event':
                    // Executive officers can create/edit anything
                    if (window.isExecutiveRole(role)) return true;
                    // Avenue directors can only create/edit events bound to their specific avenue
                    if (role === 'avenue_director' || role === 'avenue_chair') {
                        if (!metadata || !metadata.avenue_slug) return true;
                        return metadata.avenue_slug === avenue;
                    }
                    if (role === 'dpp_chair') {
                        if (!metadata || !metadata.is_dpp) return true;
                        return metadata.is_dpp === true || metadata.avenue_slug === 'dpp';
                    }
                    return false;

                case 'approve_event':
                    return window.canApprove(role);

                case 'submit_report':
                    if (window.isExecutiveRole(role)) return true;
                    if (role === 'avenue_director' || role === 'avenue_chair') {
                        if (!metadata || !metadata.avenue_slug) return true;
                        return metadata.avenue_slug === avenue;
                    }
                    if (role === 'dpp_chair') {
                        return metadata && (metadata.is_dpp === true || metadata.avenue_slug === 'dpp');
                    }
                    return false;

                case 'approve_report':
                    return window.canApprove(role);

                case 'access_treasury':
                    return window.canAccessTreasury(role, true);

                case 'view_treasury':
                    return window.canAccessTreasury(role, false);

                case 'manage_members':
                    return role === 'membership_chair' || window.isExecutiveRole(role);

                case 'manage_bulletins':
                    return role === 'club_editor' || role === 'public_image_chair' || window.isExecutiveRole(role);

                case 'manage_blood_requests':
                    return role === 'blood_donor_chair' || window.isExecutiveRole(role);

                case 'meetings_management':
                    return window.isSecretaryRole(role) || role === 'president' || role === 'vice_president';

                case 'view_board_zone':
                    return this.currentUser.isBoardMember || window.isExecutiveRole(role);

                default:
                    return false;
            }
        },

        // ==========================================
        // 4. ACTIVITY LOG (Audit Trail)
        // ==========================================
        async logActivity(userId, action, entityType, entityId, details) {
            try {
                const db = window.DB_ADMIN || window.DB;
                if (!db) return;
                const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || '');
                const u = this.currentUser;
                const d = details && typeof details === 'object' ? { ...details } : {};
                if (entityId && !isUuid(entityId)) d.entity_ref = String(entityId);
                await db.from('activity_log').insert({
                    user_id: isUuid(userId) ? userId : null,
                    user_name: u ? u.name : (d.email || 'Unauthenticated User'),
                    user_role: u ? u.role : null,
                    action: action,
                    entity_type: entityType || null,
                    entity_id: isUuid(entityId) ? entityId : null,
                    entity_name: d.name || d.applicant_name || null,
                    description: [action, entityType].filter(Boolean).join(' ').toLowerCase(),
                    details: d,
                    metadata: d,
                    user_agent: (navigator.userAgent || '').slice(0, 255)
                });
            } catch (e) {
                console.warn('Logging audit trail failed:', e.message);
            }
        },

        // ==========================================
        // 5. UI SYNC & PERMISSION UPDATE
        // ==========================================
        syncProfileUI() {
            const profileName = document.getElementById('admin-profile-name');
            const profileRole = document.getElementById('admin-profile-role');
            const profileImg = document.getElementById('admin-profile-img');
            const avatarIcon = document.getElementById('admin-profile-avatar');
            const portalBtn = document.getElementById('nav-admin-btn');
            const mobilePortalBtn = document.getElementById('mobile-portal-btn');
            const userTitle = document.getElementById('admin-user-title');

            if (this.currentUser) {
                if (profileName) profileName.textContent = this.currentUser.name;
                if (profileRole) profileRole.textContent = this.currentUser.portfolio || window.formatRoleName(this.currentUser.role);
                if (userTitle) userTitle.textContent = (this.currentUser.role || '').replace(/_/g, ' ').toUpperCase();

                if (this.currentUser.photoUrl) {
                    if (profileImg) {
                        profileImg.src = window.Uploader.getThumbnailUrl(this.currentUser.photoUrl, 'cloudinary', 100);
                        profileImg.classList.remove('hidden');
                    }
                    if (avatarIcon) avatarIcon.classList.add('hidden');
                } else {
                    if (profileImg) profileImg.classList.add('hidden');
                    if (avatarIcon) avatarIcon.classList.remove('hidden');
                }

                if (portalBtn) portalBtn.innerHTML = '<i class="fa-solid fa-gauge text-[10px]"></i>Board Panel';
                if (mobilePortalBtn) mobilePortalBtn.innerHTML = '<i class="fa-solid fa-gauge text-[10px]"></i>Board Panel';
            } else {
                if (profileName) profileName.textContent = '';
                if (profileRole) profileRole.textContent = '';
                if (profileImg) profileImg.classList.add('hidden');
                if (avatarIcon) avatarIcon.classList.remove('hidden');
                if (portalBtn) portalBtn.innerHTML = '<i class="fa-solid fa-user-shield text-[10px]"></i>Portal';
                if (mobilePortalBtn) mobilePortalBtn.innerHTML = '<i class="fa-solid fa-user-shield text-[10px]"></i>Admin Portal';
            }
        },

        updateUIPermissions() {
            const elements = document.querySelectorAll('[data-access-action]');
            elements.forEach(el => {
                const action = el.getAttribute('data-access-action');
                if (this.hasAccess(action)) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });
        },

        // ==========================================
        // 6. EVENT BINDINGS
        // ==========================================
        bindAuthForm() {
            const form = document.getElementById('auth-dialog-form');
            if (!form) return;

            // Password visibility toggle is handled by the inline script in index.html

            // Close button
            const closeBtn = document.getElementById('auth-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    document.getElementById('auth-dialog-modal')?.classList.add('hidden');
                    document.body.style.overflow = '';
                });
            }

            // Form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const email = fd.get('email');
                const password = fd.get('password');

                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Verifying...';

                const success = await this.login(email, password);

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;

                if (success) {
                    form.reset();
                }
            });
        },

        bindPortalTriggers() {
            const triggers = [
                document.getElementById('nav-admin-btn'),
                document.getElementById('mobile-portal-btn')
            ];

            triggers.forEach(btn => {
                if (!btn) return;
                btn.addEventListener('click', () => {
                    if (this.isLoggedIn()) {
                        if (window.openAdminPortal) window.openAdminPortal();
                    } else {
                        const authModal = document.getElementById('auth-dialog-modal');
                        if (authModal) {
                            authModal.classList.remove('hidden');
                            document.body.style.overflow = 'hidden';
                        }
                    }
                });
            });

            // Portal close button
            const portalCloseBtn = document.getElementById('admin-portal-close');
            if (portalCloseBtn) {
                portalCloseBtn.addEventListener('click', () => {
                    const portalModal = document.getElementById('admin-portal-modal');
                    if (portalModal) {
                        portalModal.classList.add('hidden');
                        document.body.style.overflow = '';
                    }
                });
            }

            // Logout button
            const logoutBtn = document.getElementById('admin-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    if (confirm('End your current session?')) {
                        this.logout();
                    }
                });
            }
        }
    };

    // Export global instance
    window.AuthManager = AuthManager;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AuthManager.init());
    } else {
        AuthManager.init();
    }

})();