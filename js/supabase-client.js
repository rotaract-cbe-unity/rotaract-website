/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Supabase Client - js/supabase-client.js
   Version: 3.0 - Works with file:// and hosted
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // CONFIGURATION - Using ANON key for everything
    // (Service role only works from server, not file://)
    // ============================================================
    const SUPABASE_URL = 'https://dledwtepuvzzztfypbgn.supabase.co';

    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';

    const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE0OTY0MywiZXhwIjoyMDk4NzI1NjQzfQ.FxvK5rV-Qyxod4mPJ8iW69P48wbwaC_guR_h0o75z1U';

    // ============================================================
    // DETECT ENVIRONMENT
    // ============================================================
    const IS_LOCAL = window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    // When running locally, use anon key for both
    // When hosted on server, use service key for admin
    const ADMIN_KEY = IS_LOCAL ? SUPABASE_ANON_KEY : SUPABASE_SERVICE_KEY;

    // ============================================================
    // CLUB CONFIG
    // ============================================================
    const CLUB_CONFIG = {
        name: 'Rotaract Club of Coimbatore Unity',
        family: 'Family of Rotary Club of Coimbatore East',
        clubId: '91594',
        charterDate: '21.04.2014',
        district: 'Rotary International District 3206 (Coimbatore | Pallakkad)',
        districtShort: 'RI District 3206',
        email: 'rc.cbeunity@gmail.com',
        address: 'Coimbatore, Tamil Nadu',
        socialHandle: 'rotaractunity',
        whatsappEmergency1: '9789903206',
        whatsappEmergency2: '9789953206',
        groupEmail: 'rotaractunity@googlegroups.com',
        boardEmail: 'unitys-constellation-26-27@googlegroups.com',
        reportLogoStrip: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
        reportLogoHeight: '0.43',
        reportLogoWidth: '4.63',
        dppLogoStrip: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_dppAsset_1_2x-8_prlgp6.png',
        dppLogoHeight: '0.42',
        dppLogoWidth: '5.55',
        colourLogo: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png',
        whiteLogo: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png',
        blackLogo: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png'
    };

    // ============================================================
    // EMAILJS CONFIG
    // ============================================================
    const EMAILJS_CONFIG = {
        publicKey: '5DbN9WImU8rLoat8j',
        serviceId: 'service_9bgbmrv',
        templateId: 'template_s46eqig'
    };

    // ============================================================
    // OPENROUTER CONFIG
    // ============================================================
    const OPENROUTER_CONFIG = {
        apiKey: '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',
        model: 'openai/gpt-4o'
    };

    // ============================================================
    // CLOUDINARY CONFIG
    // ============================================================
    const CLOUDINARY_CONFIG = {
        cloudName: 'duoy1cje9',
        apiKey: '763798153254981',
        uploadPreset: 'unity_uploads'
    };

    // ============================================================
    // AVENUE LABELS
    // ============================================================
    const AVENUE_LABELS = {
        club_service: 'Club Service',
        community_service: 'Community Service',
        professional_service: 'Professional Service',
        international_service: 'International Service',
        district_priority_projects: 'District Priority Projects'
    };

    // ============================================================
    // ROLE PERMISSIONS
    // ============================================================
    const ROLE_PERMISSIONS = {
        super_admin: {
            label: 'Super Administrator', level: 10, canAccess: ['all'],
            canApprove: true, canManageUsers: true, canManageSettings: true,
            canViewTreasury: true, canEditTreasury: true, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: true,
            canViewMembers: true, canEditMembers: true, canDownloadMonthly: true,
            canDownloadDPP: true, canSendMail: true, avenues: ['all']
        },
        advisor: {
            label: 'Advisor', level: 10, canAccess: ['all'],
            canApprove: true, canManageUsers: true, canManageSettings: true,
            canViewTreasury: true, canEditTreasury: true, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: true,
            canViewMembers: true, canEditMembers: true, canDownloadMonthly: true,
            canDownloadDPP: true, canSendMail: true, avenues: ['all']
        },
        president: {
            label: 'President', level: 9, canAccess: ['all'],
            canApprove: true, canManageUsers: false, canManageSettings: false,
            canViewTreasury: true, canEditTreasury: false, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: true,
            canViewMembers: true, canEditMembers: true, canDownloadMonthly: true,
            canDownloadDPP: true, canSendMail: true, avenues: ['all']
        },
        immediate_past_president: {
            label: 'Immediate Past President', level: 8, canAccess: ['all'],
            canApprove: true, canManageUsers: false, canManageSettings: false,
            canViewTreasury: true, canEditTreasury: false, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: false,
            canViewMembers: true, canEditMembers: false, canDownloadMonthly: true,
            canDownloadDPP: true, canSendMail: true, avenues: ['all']
        },
        vice_president: {
            label: 'Vice President', level: 7,
            canAccess: ['dashboard', 'events', 'reports', 'meetings', 'members'],
            canApprove: true, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: false,
            canViewMembers: true, canEditMembers: false, canDownloadMonthly: true,
            canDownloadDPP: false, canSendMail: true, avenues: ['all']
        },
        secretary_administration: {
            label: 'Secretary Administration', level: 8, canAccess: ['all'],
            canApprove: true, canManageUsers: false, canManageSettings: false,
            canViewTreasury: true, canEditTreasury: false, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: true,
            canViewMembers: true, canEditMembers: true, canDownloadMonthly: true,
            canDownloadDPP: true, canSendMail: true, avenues: ['all']
        },
        secretary_communication: {
            label: 'Secretary Communication', level: 8, canAccess: ['all'],
            canApprove: true, canManageUsers: false, canManageSettings: false,
            canViewTreasury: true, canEditTreasury: false, canViewReports: true,
            canApproveReports: true, canViewMeetings: true, canManageMeetings: true,
            canViewMembers: true, canEditMembers: true, canDownloadMonthly: true,
            canDownloadDPP: true, canSendMail: true, avenues: ['all']
        },
        secretary: {
            label: 'Secretary',
            level: 8,
            canAccess: ['all'],
            canApprove: true,
            canManageUsers: false,
            canManageSettings: false,
            canViewTreasury: true,
            canEditTreasury: false,
            canViewReports: true,
            canApproveReports: true,
            canViewMeetings: true,
            canManageMeetings: true,
            canViewMembers: true,
            canEditMembers: true,
            canDownloadMonthly: true,
            canDownloadDPP: true,
            canSendMail: true,
            avenues: ['all']
        },
        treasurer: {
            label: 'Treasurer', level: 6,
            canAccess: ['dashboard', 'treasury', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: true, canEditTreasury: true, canViewReports: false,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: []
        },
        district_priority_chair: {
            label: 'District Priority Projects Chair', level: 5,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: true, canSendMail: false,
            avenues: ['district_priority_projects']
        },
        blood_donor_chair: {
            label: 'Blood Donor Chair', level: 5,
            canAccess: ['dashboard', 'events', 'blood', 'members', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: true, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['community_service']
        },
        club_editor: {
            label: 'Club Editor', level: 5,
            canAccess: ['dashboard', 'bulletins', 'events', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: false,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: []
        },
        young_leaders_contact: {
            label: 'Young Leaders Contact', level: 5,
            canAccess: ['dashboard', 'events', 'members', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: true, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['professional_service']
        },
        public_image_chair: {
            label: 'Public Image Chair', level: 5,
            canAccess: ['dashboard', 'events', 'bulletins', 'members', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: false,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: true, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: []
        },
        membership_chair: {
            label: 'Membership Chair', level: 5,
            canAccess: ['dashboard', 'members', 'applications', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: false,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: true, canEditMembers: true, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: []
        },
        rotary_foundation_chair: {
            label: 'The Rotary Foundation Chair', level: 5,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['international_service']
        },
        club_service_director: {
            label: 'Club Service Avenue Director', level: 4,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['club_service']
        },
        community_service_director: {
            label: 'Community Service Avenue Director', level: 4,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['community_service']
        },
        professional_service_director: {
            label: 'Professional Service Avenue Director', level: 4,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['professional_service']
        },
        international_service_director: {
            label: 'International Service Avenue Director', level: 4,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: ['international_service']
        },
        avenue_director: {
            label: 'Avenue Director', level: 4,
            canAccess: ['dashboard', 'events', 'reports', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: true,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: []
        },
        member: {
            label: 'Member', level: 1, canAccess: ['dashboard', 'profile'],
            canApprove: false, canManageUsers: false, canManageSettings: false,
            canViewTreasury: false, canEditTreasury: false, canViewReports: false,
            canApproveReports: false, canViewMeetings: false, canManageMeetings: false,
            canViewMembers: false, canEditMembers: false, canDownloadMonthly: false,
            canDownloadDPP: false, canSendMail: false, avenues: []
        }
    };

    // ============================================================
    // CLIENT INSTANCES
    // ============================================================
    let _primaryClient = null;
    let _adminClient = null;

    function createClient(key) {
        return window.supabase.createClient(SUPABASE_URL, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    }

    function getPrimaryClient() {
        if (!_primaryClient) _primaryClient = createClient(SUPABASE_ANON_KEY);
        return _primaryClient;
    }

    function getAdminClient() {
        if (!_adminClient) _adminClient = createClient(ADMIN_KEY);
        return _adminClient;
    }

    // ============================================================
    // DIRECT REST API CALL (bypasses SDK issues with file://)
    // ============================================================
    async function directQuery(table, params = {}, method = 'GET', body = null) {
        const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

        Object.entries(params).forEach(([k, v]) => {
            url.searchParams.append(k, v);
        });

        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url.toString(), options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) : [];
    }

    // ============================================================
    // STORAGE HELPERS
    // ============================================================
    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    async function uploadFile(bucket, file, path) {
        const client = getAdminClient();
        const { data, error } = await client.storage
            .from(bucket)
            .upload(path, file, { upsert: true, cacheControl: '3600' });
        if (error) throw new Error('Upload failed: ' + error.message);
        const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);
        return urlData.publicUrl;
    }

    async function deleteFile(bucket, path) {
        try {
            const client = getAdminClient();
            await client.storage.from(bucket).remove([path]);
        } catch (e) { console.warn('Delete file failed:', e); }
    }

    function getPublicUrl(bucket, path) {
        const client = getPrimaryClient();
        const { data } = client.storage.from(bucket).getPublicUrl(path);
        return data ? data.publicUrl : '';
    }

    function checkFileSize(file) {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File too large. Max 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        }
        return true;
    }

    async function compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) { resolve(file); return; }
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) { resolve(file); return; }
                        resolve(new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, '.jpg'),
                            { type: 'image/jpeg', lastModified: Date.now() }
                        ));
                    },
                    'image/jpeg', quality
                );
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
            img.src = objectUrl;
        });
    }

    // ============================================================
    // SETTINGS CACHE
    // ============================================================
    let _settingsCache = null;
    let _settingsCacheTime = 0;
    const CACHE_TTL = 5 * 60 * 1000;

    async function getSettings(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && _settingsCache && (now - _settingsCacheTime) < CACHE_TTL) {
            return _settingsCache;
        }
        try {
            const data = await directQuery('site_settings', { select: 'key,value' });
            if (data && data.length) {
                _settingsCache = {};
                data.forEach(s => { _settingsCache[s.key] = s.value; });
                _settingsCacheTime = now;
                return _settingsCache;
            }
        } catch (e) {
            console.warn('Settings fetch failed:', e.message);
        }
        return _settingsCache || {};
    }

    async function updateSetting(key, value) {
        try {
            const url = `${SUPABASE_URL}/rest/v1/site_settings`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
            });
            if (!response.ok) throw new Error('Update failed');
            if (_settingsCache) _settingsCache[key] = value;
            return true;
        } catch (e) {
            console.error('Update setting failed:', e.message);
            return false;
        }
    }

    // ============================================================
    // CUSTOM DB WRAPPER - Handles both SDK and direct REST
    // ============================================================
    function createDBWrapper(anonKey) {
        const client = window.supabase.createClient(SUPABASE_URL, anonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        return client;
    }

    // ============================================================
    // WAIT FOR LIBRARY & INIT
    // ============================================================
    function waitForLibrary(callback, attempts = 0) {
        if (window.supabase && window.supabase.createClient) {
            callback();
        } else if (attempts < 100) {
            setTimeout(() => waitForLibrary(callback, attempts + 1), 50);
        } else {
            console.error('Supabase library failed to load');
        }
    }

    function init() {
        const primaryClient = getPrimaryClient();
        const adminClient = getAdminClient();

        // Both clients use anon key when running locally
        // Both work because we disabled RLS and granted anon permissions
        window.UnityDB = primaryClient;
        window.UnityAdminDB = adminClient;

        // Direct query helper for auth (most reliable)
        window.UnityDirectQuery = directQuery;

        window.UnityConfig = {
            supabase: { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, serviceKey: SUPABASE_SERVICE_KEY },
            cloudinary: CLOUDINARY_CONFIG,
            emailjs: EMAILJS_CONFIG,
            openrouter: OPENROUTER_CONFIG,
            club: CLUB_CONFIG,
            roles: ROLE_PERMISSIONS,
            avenues: AVENUE_LABELS,
            isLocal: IS_LOCAL
        };

        window.UnityStorage = {
            uploadFile,
            deleteFile,
            getPublicUrl,
            checkFileSize,
            compressImage,
            MAX_FILE_SIZE
        };

        window.UnitySettings = {
            get: getSettings,
            update: updateSetting,
            clearCache: () => { _settingsCache = null; _settingsCacheTime = 0; }
        };

        console.log(
            '%c Rotaract Club of Coimbatore Unity ',
            'background:#1a56db;color:#fff;font-weight:700;padding:4px 12px;border-radius:6px;'
        );
        console.log(
            `%c Running ${IS_LOCAL ? 'LOCAL (file://)' : 'HOSTED'} mode `,
            `color:${IS_LOCAL ? '#f59e0b' : '#10b981'};font-weight:600;`
        );
    }

    waitForLibrary(init);

})();