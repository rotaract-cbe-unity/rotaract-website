// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Core Application Engine - Updated
// File: js/app.js | Version: 5.1.0
// All bug fixes applied
// ============================================

(function () {
    'use strict';

    // ==========================================
    // 1. CONFIGURATION
    // ==========================================
    const CONFIG = {
        SUPABASE_URL: 'https://sbpwmkoxuokrscddhhuw.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicHdta294dW9rcnNjZGRoaHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNTI1MDksImV4cCI6MjEwNjYyODUwOX0.s6-r3bywFii-ZcMowwjZnI1WtrpluJ5MQ1_UJJFcDQU',
        SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicHdta294dW9rcnNjZGRoaHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA1MjUwOSwiZXhwIjoyMTA2NjI4NTA5fQ.XME9xM1FhB5HOOMi2bQHV699scfTn6Cp8ROW0PT1i8U',
        CLOUDINARY_CLOUD: 'duoy1cje9',
        CLOUDINARY_PRESET: 'unity_unsigned',
        CLOUDINARY_API_KEY: '763798153254981',
        CHATBOT_API_KEY: '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',
        CHATBOT_MODEL: 'openai/gpt-4o',
        CACHE_TTL: 60,
        PAGE_SIZE: 20,
        VERSION: '5.1.0',
        GAS_URL: 'https://script.google.com/macros/s/AKfycbwiPZ3D7xPhbJ617w4xH2pCP_7EpIWH9HgEdJEEmVEuKD7tMcUMS1ei114jmE-fK8cPew/exec',
        CLUB_NAME: 'Rotaract Club of Coimbatore Unity',
        PARENT_CLUB: 'Family of Rotary Club of Coimbatore East',
        CLUB_ID: '91594',
        CHARTER_DATE: '21.04.2014',
        DISTRICT: 'Rotary International District 3206',
        DISTRICT_REGION: 'Coimbatore | Palakkad'
    };

    // Suppress Tailwind CDN production warning
    const originalWarn = console.warn;
    console.warn = function (...args) {
        if (args[0] && typeof args[0] === 'string' &&
            (args[0].includes('cdn.tailwindcss.com') || args[0].includes('tailwindcss'))) {
            return;
        }
        originalWarn.apply(console, args);
    };

    let supabaseClient = null;
    let supabaseAdmin = null;

    // ==========================================
    // 2. CINEMATIC LOADING ORCHESTRATOR
    // ==========================================
    const Loader = {
        el: null,
        progress: 0,
        startTime: 0,

        init() {
            this.el = document.getElementById('global-loader');
            this.startTime = performance.now();
            this.animateEntry();
        },

        animateEntry() {
            const percentEl = document.getElementById('loader-percent');
            const progressEl = document.getElementById('loader-progress');
            if (!percentEl || !progressEl) return;

            const animate = () => {
                if (this.progress < 100) {
                    requestAnimationFrame(animate);
                }
                percentEl.textContent = Math.floor(this.progress) + '%';
                progressEl.style.width = this.progress + '%';
            };
            requestAnimationFrame(animate);
        },

        setProgress(value) {
            this.progress = Math.min(value, 100);
        },

        async runTasks(tasks) {
            const total = tasks.length;
            for (let i = 0; i < total; i++) {
                try {
                    await tasks[i].fn();
                } catch (e) {
                    console.warn('Task failed:', tasks[i].name, e);
                }
                this.setProgress(((i + 1) / total) * 100);
            }
        },

        hide() {
            this.setProgress(100);
            const elapsed = performance.now() - this.startTime;
            const minDisplayTime = 1200;
            const remaining = Math.max(0, minDisplayTime - elapsed);

            setTimeout(() => {
                if (this.el) {
                    this.el.classList.add('loader-hidden');
                    setTimeout(() => {
                        if (this.el) this.el.remove();
                    }, 700);
                }
            }, remaining);
        }
    };

    // ==========================================
    // 3. SUPABASE INITIALIZATION (BUG-FREE)
    // ==========================================
    function initSupabase() {
        try {
            if (typeof supabase === 'undefined' || !supabase.createClient) {
                console.error('[Supabase] Library not loaded');
                return false;
            }

            // Prevent duplicate client creation (fixes GoTrueClient warning)
            if (window.DB && window.DB_ADMIN) {
                console.log('[Supabase] Clients already initialized, reusing');
                supabaseClient = window.DB;
                supabaseAdmin = window.DB_ADMIN;
                return true;
            }

            // Create anon client with unique storage key
            supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
                auth: {
                    storageKey: 'unity-anon-auth',
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
                global: {
                    headers: { 'x-client-info': 'unity-portal-anon' }
                }
            });

            // Create service role client with unique storage key
            supabaseAdmin = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
                auth: {
                    storageKey: 'unity-service-auth',
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
                global: {
                    headers: { 'x-client-info': 'unity-portal-service' }
                }
            });


            // supabase-js returns { error } instead of throwing, so failed saves looked successful.
            // Make writes to the known tables reject so existing try/catch blocks show the real error.
            [supabaseClient, supabaseAdmin].forEach(cl => {
                const from = cl.from.bind(cl);
                const tracked = ['events', 'treasury', 'meetings', 'site_settings', 'system_settings', 'membership_applications',
                    'meeting_attendance', 'activity_log', 'upload_log', 'storage_providers'];
                const UID = ['created_by', 'approved_by', 'reviewed_by', 'report_submitted_by', 'minutes_approved_by',
                    'updated_by', 'user_id', 'entity_id', 'reference_id'];
                const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
                // Portal logins use ids like 'usr-01'; uuid columns reject those, so store null instead.
                const clean = v => Array.isArray(v) ? v.map(clean)
                    : (v && typeof v === 'object' && !(v instanceof Date))
                        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, UID.includes(k) && x != null && !isUuid(x) ? null : x]))
                        : v;
                cl.from = table => {
                    const q = from(table);
                    if (!tracked.includes(table)) return q;
                    ['insert', 'update', 'upsert', 'delete'].forEach(m => {
                        const fn = q[m].bind(q);
                        q[m] = (...args) => {
                            if (m !== 'delete' && args.length) args[0] = clean(args[0]);
                            const b = fn(...args);
                            const t = b.then.bind(b);
                            b.then = (ok, bad) => t(res => {
                                if (res && res.error) throw new Error(res.error.message);
                                return res;
                            }).then(ok, bad);
                            return b;
                        };
                    });
                    return q;
                };
            });

            window.DB = supabaseClient;
            window.DB_ADMIN = supabaseAdmin;

            console.log('[Supabase] Clients initialized successfully');
            return true;
        } catch (e) {
            console.error('[Supabase] Initialization failed:', e);
            return false;
        }
    }

    // ==========================================
    // 4. LOCAL STORAGE CACHE
    // ==========================================
    const Cache = {
        prefix: 'unity_',

        set(key, data, ttl) {
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify({
                    data,
                    expires: Date.now() + (ttl || CONFIG.CACHE_TTL) * 60000,
                    v: CONFIG.VERSION
                }));
            } catch (e) {
                this.cleanup();
            }
        },

        get(key) {
            try {
                const raw = localStorage.getItem(this.prefix + key);
                if (!raw) return null;
                const item = JSON.parse(raw);
                if (Date.now() > item.expires || item.v !== CONFIG.VERSION) {
                    localStorage.removeItem(this.prefix + key);
                    return null;
                }
                return item.data;
            } catch (e) {
                return null;
            }
        },

        remove(key) {
            localStorage.removeItem(this.prefix + key);
        },

        clear() {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(this.prefix)) localStorage.removeItem(k);
            });
        },

        cleanup() {
            let oldest = null;
            let oldestTime = Infinity;
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(this.prefix)) {
                    try {
                        const t = JSON.parse(localStorage.getItem(k)).expires;
                        if (t < oldestTime) {
                            oldest = k;
                            oldestTime = t;
                        }
                    } catch (e) {
                        localStorage.removeItem(k);
                    }
                }
            });
            if (oldest) localStorage.removeItem(oldest);
        }
    };
    window.AppCache = Cache;

    // ==========================================
    // 5. SETTINGS MANAGER
    // ==========================================
    const Settings = {
        _cache: {},
        _loaded: false,

        async loadAll() {
            const cached = Cache.get('site_settings');
            if (cached) {
                this._cache = cached;
                this._loaded = true;
                return cached;
            }
            try {
                const { data, error } = await supabaseAdmin
                    .from('system_settings')
                    .select('key, value, data_type, category');
                if (error) throw error;
                const map = {};
                (data || []).forEach(r => {
                    map[r.key] = {
                        value: r.value,
                        type: r.data_type,
                        category: r.category
                    };
                });
                this._cache = map;
                this._loaded = true;
                Cache.set('site_settings', map, 30);
                return map;
            } catch (e) {
                console.warn('[Settings] Load failed:', e.message);
                return {};
            }
        },

        get(key, fallback) {
            fallback = fallback !== undefined ? fallback : '';
            if (!this._cache[key]) return fallback;
            const val = this._cache[key].value;
            if (this._cache[key].type === 'boolean') return val === 'true';
            if (this._cache[key].type === 'number') return parseFloat(val) || 0;
            return val || fallback;
        },

        async update(key, value) {
            try {
                const cat = (this._cache[key] && this._cache[key].category) || 'general';
                const { error } = await supabaseAdmin
                    .from('system_settings')
                    .upsert({ key: key, value: String(value), category: cat, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                if (error) throw error;
                if (this._cache[key]) this._cache[key].value = String(value);
                else this._cache[key] = { value: String(value), type: 'text', category: 'general' };
                Cache.remove('site_settings');
                return true;
            } catch (e) {
                return false;
            }
        },

        getByCategory(cat) {
            const r = {};
            Object.keys(this._cache).forEach(k => {
                if (this._cache[k].category === cat) r[k] = this._cache[k];
            });
            return r;
        }
    };
    window.SiteSettings = Settings;

    // ==========================================
    // 6. THEME ENGINE
    // ==========================================
    const Theme = {
        current: 'light',

        init() {
            const saved = localStorage.getItem('unity_theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.current = saved || (prefersDark ? 'dark' : 'light');
            this.apply();
            this.bindToggle();

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('unity_theme')) {
                    this.current = e.matches ? 'dark' : 'light';
                    this.apply();
                }
            });
        },

        apply() {
            document.documentElement.classList.toggle('dark', this.current === 'dark');
        },

        toggle() {
            this.current = this.current === 'dark' ? 'light' : 'dark';
            localStorage.setItem('unity_theme', this.current);
            this.apply();
        },

        bindToggle() {
            ['theme-toggle', 'theme-toggle-mobile'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.addEventListener('click', () => this.toggle());
            });
        }
    };

    // ==========================================
    // 7. TOAST ENGINE
    // ==========================================
    const Toast = {
        container: null,

        init() {
            if (document.querySelector('.toast-container')) return;
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.setAttribute('role', 'alert');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
        },

        show(msg, type, dur) {
            type = type || 'info';
            dur = dur || 4000;

            if (!this.container) this.init();

            const icons = {
                success: 'fa-circle-check',
                error: 'fa-circle-xmark',
                warning: 'fa-triangle-exclamation',
                info: 'fa-circle-info'
            };
            const colors = {
                success: 'text-green-500',
                error: 'text-red-500',
                warning: 'text-yellow-500',
                info: 'text-blue-500'
            };

            const t = document.createElement('div');
            t.className = 'toast ' + type;
            t.innerHTML =
                '<i class="fa-solid ' + (icons[type] || icons.info) + ' ' + (colors[type] || colors.info) + '"></i>' +
                '<span>' + msg + '</span>' +
                '<button onclick="this.parentElement.remove()" class="ml-auto text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-xs"></i></button>';

            this.container.appendChild(t);
            requestAnimationFrame(() => t.classList.add('show'));

            setTimeout(() => {
                t.classList.remove('show');
                setTimeout(() => t.remove(), 300);
            }, dur);
        },

        success(m) { this.show(m, 'success'); },
        error(m) { this.show(m, 'error', 6000); },
        warning(m) { this.show(m, 'warning'); },
        info(m) { this.show(m, 'info'); }
    };
    window.Toast = Toast;
    window.AppToast = Toast;

    // ==========================================
    // 8. IMAGE COMPRESSOR
    // ==========================================
    const ImageCompressor = {
        async compress(file, opts) {
            opts = opts || {};
            const maxW = opts.maxWidth || 1200;
            const maxH = opts.maxHeight || 1200;
            const quality = opts.quality || 0.80;

            return new Promise((resolve, reject) => {
                if (!file || !file.type.startsWith('image/')) {
                    return reject(new Error('Invalid image file'));
                }
                if (file.size < 50000 && file.type === 'image/jpeg') {
                    return resolve(file);
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if (w > maxW || h > maxH) {
                            const r = Math.min(maxW / w, maxH / h);
                            w = Math.round(w * r);
                            h = Math.round(h * r);
                        }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, w, h);
                        canvas.toBlob(blob => {
                            if (!blob) return reject(new Error('Compression failed'));
                            resolve(new File(
                                [blob],
                                file.name.replace(/\.[^.]+$/, '.jpg'),
                                { type: 'image/jpeg', lastModified: Date.now() }
                            ));
                        }, 'image/jpeg', quality);
                    };
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsDataURL(file);
            });
        },

        getPreset(type) {
            const presets = {
                poster: { maxWidth: 1200, quality: 0.75 },
                photo: { maxWidth: 1600, quality: 0.80 },
                report_photo: { maxWidth: 1400, quality: 0.75 },
                profile: { maxWidth: 500, quality: 0.80 },
                signature: { maxWidth: 400, quality: 0.70 },
                receipt: { maxWidth: 1000, quality: 0.75 },
                bulletin_cover: { maxWidth: 800, quality: 0.75 },
                meeting_poster: { maxWidth: 1200, quality: 0.75 },
                meeting_photo: { maxWidth: 1400, quality: 0.75 },
                thumbnail: { maxWidth: 300, quality: 0.70 }
            };
            return presets[type] || { maxWidth: 1200, quality: 0.80 };
        }
    };
    window.ImageCompressor = ImageCompressor;

    // ==========================================
    // 9. MULTI-PROVIDER UPLOAD ENGINE
    // ==========================================
    const Uploader = {
        configs: {},
        order: ['cloudinary', 'supabase_storage', 'imgbb', 'freeimage'],

        async init() {
            try {
                const { data } = await supabaseAdmin
                    .from('storage_providers')
                    .select('*')
                    .eq('is_active', true)
                    .order('priority');
                if (data) {
                    data.forEach(p => {
                        this.configs[p.provider_name] = p;
                    });
                    this.order = data.map(p => p.provider_name);
                }
            } catch (e) {
                console.warn('[Uploader] Provider configs not loaded, using defaults');
            }
        },

        async upload(file, opts) {
            opts = opts || {};
            const preset = ImageCompressor.getPreset(opts.type || 'photo');
            let compressed;
            try {
                compressed = await ImageCompressor.compress(file, preset);
            } catch (e) {
                compressed = file;
            }

            for (const name of this.order) {
                const cfg = this.configs[name];
                if (cfg && (!cfg.is_active || !cfg.is_healthy)) continue;
                if (cfg && cfg.max_file_size_mb && compressed.size > cfg.max_file_size_mb * 1048576) continue;
                if (cfg && cfg.last_reset_date !== new Date().toISOString().slice(0, 10)) {
                    cfg.current_daily_uploads = 0; // new day: counter resets
                }
                if (cfg && cfg.daily_upload_limit && cfg.current_daily_uploads >= cfg.daily_upload_limit) continue;
                try {
                    const result = await this['to_' + name](compressed, opts);
                    this.track(name, true);
                    this.log(file, compressed, name, result, opts);
                    return {
                        url: result.url,
                        publicId: result.publicId || '',
                        provider: name,
                        originalSize: file.size,
                        compressedSize: compressed.size
                    };
                } catch (e) {
                    console.warn('[Upload] ' + name + ' failed:', e.message);
                    this.track(name, false);
                    continue;
                }
            }
            throw new Error('All upload providers failed');
        },

        async to_cloudinary(file, opts) {
            const cfg = (this.configs.cloudinary || {}).config || {};
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', cfg.upload_preset || CONFIG.CLOUDINARY_PRESET);
            fd.append('folder', opts.folder || cfg.folder || 'unity');

            const res = await fetch(
                'https://api.cloudinary.com/v1_1/' + (cfg.cloud_name || CONFIG.CLOUDINARY_CLOUD) + '/image/upload',
                { method: 'POST', body: fd }
            );
            if (!res.ok) throw new Error('Cloudinary error');
            const d = await res.json();
            return { url: d.secure_url, publicId: d.public_id };
        },

        async to_supabase_storage(file, opts) {
            const buckets = {
                poster: 'posters', photo: 'photos', report_photo: 'event-reports',
                profile: 'profiles', signature: 'signatures', receipt: 'receipts',
                bulletin_cover: 'bulletins', meeting_poster: 'posters',
                meeting_photo: 'meeting-photos'
            };
            const bucket = opts.bucket || buckets[opts.type] || 'photos';
            const path = (opts.folder || 'general') + '/' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.jpg';
            const { error } = await supabaseAdmin.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '31536000',
                    contentType: 'image/jpeg'
                });
            if (error) throw error;
            return {
                url: supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl,
                publicId: bucket + '/' + path
            };
        },

        async to_imgbb(file) {
            const key = (this.configs.imgbb || {}).config?.api_key || Settings.get('imgbb_api_key');
            if (!key) throw new Error('No ImgBB key');
            const fd = new FormData();
            fd.append('image', file);
            fd.append('key', key);
            const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
            const d = await res.json();
            if (!d.success) throw new Error('ImgBB error');
            return { url: d.data.url, publicId: d.data.id };
        },

        async to_freeimage(file) {
            const key = (this.configs.freeimage || {}).config?.api_key || Settings.get('freeimage_api_key');
            if (!key) throw new Error('No FreeImage key');
            const fd = new FormData();
            fd.append('source', file);
            fd.append('key', key);
            fd.append('format', 'json');
            const res = await fetch('https://freeimage.host/api/1/upload', { method: 'POST', body: fd });
            const d = await res.json();
            if (d.status_code !== 200) throw new Error('FreeImage error');
            return { url: d.image.url, publicId: d.image.id };
        },

        async track(name, ok) {
            const cfg = this.configs[name];
            if (!cfg) return;
            const today = new Date().toISOString().slice(0, 10);
            try {
                if (ok) {
                    cfg.current_daily_uploads = (cfg.current_daily_uploads || 0) + 1;
                    cfg.error_count = 0;
                    cfg.last_reset_date = today;
                    await supabaseAdmin.from('storage_providers').update({
                        current_daily_uploads: cfg.current_daily_uploads, error_count: 0, last_reset_date: today
                    }).eq('provider_name', name);
                } else {
                    cfg.error_count = (cfg.error_count || 0) + 1;
                    if (cfg.error_count >= 3) cfg.is_healthy = false;
                    await supabaseAdmin.from('storage_providers').update({
                        error_count: cfg.error_count, is_healthy: cfg.is_healthy !== false
                    }).eq('provider_name', name);
                }
            } catch (e) { /* counters are best effort */ }
        },

        async log(orig, comp, provider, result, opts) {
            try {
                await supabaseAdmin.from('upload_log').insert({
                    original_filename: orig.name,
                    original_size_bytes: orig.size,
                    compressed_size_bytes: comp.size,
                    compression_ratio: orig.size > 0 ? comp.size / orig.size : 0,
                    provider_used: provider,
                    provider_url: result.url,
                    provider_public_id: result.publicId || '',
                    upload_type: opts.type || 'photo',
                    status: 'success'
                });
            } catch (e) { /* silent */ }
        },

        getThumbnailUrl(url, provider, w) {
            w = w || 300;
            if (!url) return '';
            if (url.indexOf('cloudinary.com') !== -1) {
                return url.replace('/upload/', '/upload/w_' + w + ',q_auto,f_auto,c_fill/');
            }
            return url;
        },

        formatSize(b) {
            if (!b) return '0 B';
            const k = 1024;
            const s = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(b) / Math.log(k));
            return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
        }
    };
    window.Uploader = Uploader;

    // ==========================================
    // 10. NAVIGATION ENGINE
    // ==========================================
    const Navigation = {
        isMenuOpen: false,

        init() {
            this.bindScroll();
            this.bindMobileMenu();
            this.bindSmoothScroll();
            this.initBackToTop();
            this.highlightActiveSection();
        },

        bindScroll() {
            const nav = document.getElementById('main-nav');
            if (!nav) return;
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        nav.classList.toggle('scrolled', window.scrollY > 40);
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        },

        bindMobileMenu() {
            const trigger = document.getElementById('mobile-menu-trigger');
            const drawer = document.getElementById('mobile-drawer');
            if (!trigger || !drawer) return;

            trigger.addEventListener('click', () => {
                this.isMenuOpen = !this.isMenuOpen;
                trigger.classList.toggle('active', this.isMenuOpen);
                if (this.isMenuOpen) {
                    drawer.classList.remove('hidden');
                    requestAnimationFrame(() => drawer.classList.add('open'));
                } else {
                    drawer.classList.remove('open');
                    setTimeout(() => drawer.classList.add('hidden'), 300);
                }
            });

            drawer.querySelectorAll('a, button').forEach(el => {
                el.addEventListener('click', () => {
                    this.isMenuOpen = false;
                    trigger.classList.remove('active');
                    drawer.classList.remove('open');
                    setTimeout(() => drawer.classList.add('hidden'), 300);
                });
            });
        },

        bindSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach(a => {
                a.addEventListener('click', (e) => {
                    const href = a.getAttribute('href');
                    if (href === '#' || href.length < 2) return;
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        },

        initBackToTop() {
            if (document.getElementById('back-to-top')) return;
            const btn = document.createElement('button');
            btn.id = 'back-to-top';
            btn.innerHTML = '<i class="fa-solid fa-arrow-up text-sm"></i>';
            btn.setAttribute('aria-label', 'Back to top');
            document.body.appendChild(btn);
            window.addEventListener('scroll', () => {
                btn.classList.toggle('visible', window.scrollY > 600);
            }, { passive: true });
            btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        },

        highlightActiveSection() {
            const sections = document.querySelectorAll('section[id]');
            const links = document.querySelectorAll('.nav-link');
            if (!sections.length || !links.length) return;
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        links.forEach(l => {
                            l.classList.toggle('active', l.getAttribute('href') === '#' + id);
                        });
                    }
                });
            }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });
            sections.forEach(s => observer.observe(s));
        }
    };

    // ==========================================
    // 11. SCROLL REVEAL & EFFECTS
    // ==========================================
    const ScrollFX = {
        init() {
            this.revealElements();
            this.counterElements();
            this.parallaxElements();
        },

        revealElements() {
            const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
            if (!els.length) return;
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            els.forEach(el => observer.observe(el));
        },

        counterElements() {
            const els = document.querySelectorAll('[data-counter]');
            if (!els.length) return;
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateCounter(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            els.forEach(el => observer.observe(el));
        },

        animateCounter(el) {
            const target = parseInt(el.getAttribute('data-counter')) || 0;
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 2200;
            const start = performance.now();
            const tick = (now) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(tick);
                else el.textContent = target.toLocaleString() + suffix;
            };
            requestAnimationFrame(tick);
        },

        parallaxElements() {
            const orbs = document.querySelectorAll('.animate-float-slow, .animate-float-medium, .animate-float-fast');
            if (!orbs.length || window.innerWidth < 768) return;
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        const scrollY = window.scrollY;
                        orbs.forEach((orb, i) => {
                            const speed = [0.02, 0.03, 0.04][i % 3];
                            orb.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
                        });
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        }
    };

    // ==========================================
    // 12. DATA LOADERS
    // ==========================================
    // ==========================================
    // 12a. LIVE IMPACT STATISTICS
    //      Auto-calculated from live data, optionally overridden / adjusted
    //      by the admin in Site Settings > Live Impact Stats.
    //      The Super Admin is a system account, NOT a club member, so it is
    //      never counted in "Active Members".
    // ==========================================
    const UnityStats = {
        defs: [
            { key: 'total_members',      el: 'stat-members-count',       label: 'Active Members' },
            { key: 'projects_completed', el: 'stat-projects-count',      label: 'Projects Done' },
            { key: 'service_hours',      el: 'stat-hours-count',         label: 'Service Hours' },
            { key: 'beneficiaries',      el: 'stat-beneficiaries-count', label: 'Lives Impacted' }
        ],

        // Setting keys stored in system_settings:
        //   stat_<key>_mode    'auto' | 'manual'
        //   stat_<key>_manual  number (used when mode = manual)
        //   stat_<key>_offset  number (added to the calculated value in auto mode)
        //   stats_suffix       text shown after each number (default '+')
        settingKeys() {
            const keys = ['stats_suffix'];
            this.defs.forEach(d => keys.push('stat_' + d.key + '_mode', 'stat_' + d.key + '_manual', 'stat_' + d.key + '_offset'));
            return keys;
        },

        // Raw numbers calculated from the database (no overrides applied).
        async calculate() {
            const values = { total_members: 0, projects_completed: 0, service_hours: 0, beneficiaries: 0 };
            const failed = [];

            // Active members: every active user except the Super Admin system account.
            try {
                const { count, error } = await supabaseAdmin
                    .from('users')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .neq('role', 'super_admin');
                if (error) throw error;
                values.total_members = count || 0;
            } catch (e) {
                failed.push('total_members');
            }

            // Completed projects, service hours and beneficiaries (paged to pass the 1000-row API limit).
            try {
                const size = 1000;
                let from = 0, projects = 0, hours = 0, benef = 0;
                for (;;) {
                    const { data, error } = await supabaseAdmin
                        .from('events')
                        .select('id, service_hours, beneficiaries_count')
                        .eq('status', 'completed')
                        .order('id')
                        .range(from, from + size - 1);
                    if (error) throw error;
                    (data || []).forEach(r => {
                        projects++;
                        hours += parseFloat(r.service_hours) || 0;
                        benef += parseInt(r.beneficiaries_count, 10) || 0;
                    });
                    if (!data || data.length < size) break;
                    from += size;
                }
                values.projects_completed = projects;
                values.service_hours = Math.round(hours * 100) / 100;
                values.beneficiaries = benef;
            } catch (e) {
                failed.push('projects_completed', 'service_hours', 'beneficiaries');
            }

            return { values, failed };
        },

        async fetchSettings() {
            const cfg = {};
            const { data, error } = await supabaseAdmin
                .from('system_settings')
                .select('key, value')
                .in('key', this.settingKeys());
            if (error) throw error;
            (data || []).forEach(r => { cfg[r.key] = r.value; });
            return cfg;
        },

        // Applies the admin's mode / manual value / offset to the calculated numbers.
        resolve(auto, cfg) {
            cfg = cfg || {};
            auto = auto || {};
            const out = {};
            this.defs.forEach(d => {
                const k = d.key;
                const mode = String(cfg['stat_' + k + '_mode'] || 'auto').toLowerCase().trim();
                const manual = parseFloat(cfg['stat_' + k + '_manual']);
                const offset = parseFloat(cfg['stat_' + k + '_offset']) || 0;
                const val = (mode === 'manual' && !isNaN(manual)) ? manual : (parseFloat(auto[k]) || 0) + offset;
                out[k] = Math.max(0, Math.round(val));
            });
            return out;
        },

        async load(force) {
            if (!force) {
                const cached = Cache.get('statistics_live');
                if (cached) return cached;
            }
            let cfg = {};
            try { cfg = await this.fetchSettings(); } catch (e) { cfg = {}; }

            const { values, failed } = await this.calculate();

            // If a live calculation was blocked, fall back to the stored club_statistics row.
            if (failed.length) {
                try {
                    const { data } = await supabaseAdmin.from('club_statistics').select('stat_key, stat_value');
                    (data || []).forEach(s => {
                        if (failed.includes(s.stat_key)) values[s.stat_key] = parseFloat(s.stat_value) || 0;
                    });
                } catch (e) { /* silent */ }
            }

            const result = {
                values: this.resolve(values, cfg),
                auto: values,
                config: cfg,
                suffix: cfg.stats_suffix !== undefined && cfg.stats_suffix !== null ? String(cfg.stats_suffix) : '+'
            };
            Cache.set('statistics_live', result, 2);
            return result;
        },

        // Called by the admin panel after saving so the next page load is fresh.
        invalidate() {
            Cache.remove('statistics_live');
            Cache.remove('statistics');
            Cache.remove('site_settings');
        }
    };

    let _statsTimer = null;

    function paintStatistics(res, animate) {
        UnityStats.defs.forEach(d => {
            const el = document.getElementById(d.el);
            if (!el) return;
            const next = String(res.values[d.key]);
            const changed = el.getAttribute('data-counter') !== next || el.getAttribute('data-suffix') !== res.suffix;
            el.setAttribute('data-counter', next);
            el.setAttribute('data-suffix', res.suffix);
            if (!animate) el.textContent = '0' + res.suffix;
            else if (changed) ScrollFX.animateCounter(el);
        });
    }

    async function loadStatistics() {
        let res = null;
        try { res = await UnityStats.load(); } catch (e) { res = null; }
        if (!res) return;
        paintStatistics(res, false);

        // Keep the "Live" card fresh while the page stays open.
        if (!_statsTimer) {
            _statsTimer = setInterval(async () => {
                if (document.hidden) return;
                try { paintStatistics(await UnityStats.load(true), true); } catch (e) { /* silent */ }
            }, 180000);
        }
    }

    async function loadBenefits() {
        const container = document.getElementById('benefits-grid');
        if (!container) return;
        const cached = Cache.get('benefits');
        let benefits = cached;
        if (!cached) {
            try {
                const { data } = await supabaseAdmin
                    .from('joining_benefits')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order');
                benefits = data;
                Cache.set('benefits', data, 120);
            } catch (e) {
                benefits = [];
            }
        }
        const iconMap = {
            leadership: 'fa-chess-king',
            network: 'fa-diagram-project',
            community: 'fa-hand-holding-heart',
            globe: 'fa-earth-americas',
            growth: 'fa-seedling',
            fellowship: 'fa-people-group',
            career: 'fa-briefcase',
            award: 'fa-award'
        };
        container.innerHTML = '';
        (benefits || []).forEach(b => {
            const card = document.createElement('div');
            card.className = 'benefit-card reveal';
            card.innerHTML =
                '<div class="benefit-icon"><i class="fa-solid ' + (iconMap[b.icon] || 'fa-star') + '"></i></div>' +
                '<h4 class="text-sm font-bold mb-2">' + escapeHtml(b.title) + '</h4>' +
                '<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">' + escapeHtml(b.description) + '</p>';
            container.appendChild(card);
        });
    }

    async function loadUpcomingEvents() {
        const container = document.getElementById('upcoming-events-container');
        if (!container) return;
        container.innerHTML = renderSkeletonCards(3);
        try {
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            const { data } = await supabaseAdmin
                .from('events')
                .select('*, avenues(name)')
                .eq('status', 'approved')
                .gte('date', today)
                .lte('date', nextWeek)
                .order('date')
                .order('start_time');
            container.innerHTML = '';
            if (!data || !data.length) {
                container.innerHTML = '<div class="col-span-full empty-state"><i class="fa-solid fa-calendar-xmark empty-state-icon"></i><h4 class="empty-state-title">No Upcoming Events</h4><p class="empty-state-desc">No projects scheduled in the next 7 days.</p></div>';
                return;
            }
            data.forEach(e => container.appendChild(createEventCard(e, true)));
        } catch (e) {
            container.innerHTML = '<div class="col-span-full text-center py-12 text-xs text-slate-500"><i class="fa-solid fa-triangle-exclamation text-2xl text-yellow-500 mb-4 block"></i>Unable to load events.</div>';
        }
    }

    const CompletedEvents = {
        avenue: 'club_service',
        page: 1,
        pages: 1,
        limit: 6,

        async init() {
            document.querySelectorAll('.avenue-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.avenue-tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.avenue = btn.getAttribute('data-avenue');
                    this.page = 1;
                    this.load();
                });
            });
            const prev = document.getElementById('prev-page-btn');
            const next = document.getElementById('next-page-btn');
            if (prev) prev.addEventListener('click', () => {
                if (this.page > 1) { this.page--; this.load(); }
            });
            if (next) next.addEventListener('click', () => {
                if (this.page < this.pages) { this.page++; this.load(); }
            });
            await this.load();
        },

        async load() {
            const container = document.getElementById('completed-projects-grid');
            if (!container) return;
            container.innerHTML = renderSkeletonCards(3);
            try {
                const offset = (this.page - 1) * this.limit;
                const { data, count } = await supabaseAdmin
                    .from('events')
                    .select('*, avenues(name)', { count: 'exact' })
                    .eq('status', 'completed')
                    .eq('avenue_slug', this.avenue)
                    .order('date', { ascending: false })
                    .range(offset, offset + this.limit - 1);
                container.innerHTML = '';
                if (!data || !data.length) {
                    container.innerHTML = '<div class="col-span-full empty-state"><i class="fa-solid fa-folder-open empty-state-icon"></i><h4 class="empty-state-title">No Completed Events</h4><p class="empty-state-desc">No completed events for this avenue yet.</p></div>';
                    const pg = document.getElementById('completed-pagination');
                    if (pg) pg.classList.add('hidden');
                    return;
                }
                data.forEach(e => container.appendChild(createEventCard(e, false)));
                this.pages = Math.ceil((count || data.length) / this.limit);
                const pg = document.getElementById('completed-pagination');
                const ind = document.getElementById('page-indicator');
                if (this.pages > 1) {
                    if (pg) pg.classList.remove('hidden');
                    if (ind) ind.textContent = 'Page ' + this.page + ' of ' + this.pages;
                } else {
                    if (pg) pg.classList.add('hidden');
                }
            } catch (e) {
                container.innerHTML = '<div class="col-span-full text-center py-12 text-xs text-slate-500">Failed to load.</div>';
            }
        }
    };

    function createEventCard(event, isUpcoming) {
        const card = document.createElement('div');
        card.className = 'event-card reveal';
        const avenueName = event.avenues?.name || (event.avenue_slug || '').replace(/_/g, ' ');
        const avenueClass = {
            dpp: 'dpp',
            community_service: 'community',
            international_service: 'international',
            professional_service: 'professional'
        }[event.avenue_slug] || '';
        const poster = event.poster_url ? Uploader.getThumbnailUrl(event.poster_url, event.poster_provider || 'cloudinary', 600) : '';
        const dateStr = new Date(event.date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const timeStr = event.start_time ? formatTime(event.start_time) : '';

        card.innerHTML =
            '<div class="event-card-poster">' +
            (isUpcoming ? '<div class="event-pulse"></div>' : '') +
            (poster
                ? '<img src="' + poster + '" alt="' + escapeHtml(event.event_name) + '" loading="lazy" onerror="this.style.display=\'none\'">'
                : '<div class="img-placeholder w-full h-full"><i class="fa-solid fa-image"></i></div>') +
            '<div class="overlay-gradient"></div></div>' +
            '<div class="event-card-body">' +
            '<div class="flex items-center justify-between mb-3">' +
            '<span class="event-card-avenue ' + avenueClass + '">' + escapeHtml(avenueName) + '</span>' +
            (event.is_dpp ? '<span class="badge badge-yellow">DPP</span>' : '') +
            '</div>' +
            '<h4 class="text-sm font-bold tracking-tight mb-2 truncate-2">' + escapeHtml(event.event_name) + '</h4>' +
            '<div class="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mb-3">' +
            '<span class="flex items-center gap-1"><i class="fa-regular fa-calendar"></i> ' + dateStr + '</span>' +
            (timeStr ? '<span class="flex items-center gap-1"><i class="fa-regular fa-clock"></i> ' + timeStr + '</span>' : '') +
            '</div>' +
            (event.venue ? '<p class="text-[10px] text-slate-400 flex items-center gap-1 truncate"><i class="fa-solid fa-location-dot"></i> ' + escapeHtml(event.venue) + '</p>' : '') +
            '<div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">' +
            '<button class="text-[10px] font-bold text-brand-blue hover:underline view-details-btn"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Full Details</button>' +
            '<button class="text-[10px] text-slate-400 hover:text-brand-blue add-cal-btn" title="Add to Calendar"><i class="fa-regular fa-calendar-plus"></i></button>' +
            '</div></div>';

        card.querySelector('.view-details-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEventDetailModal(event.id);
        });
        card.querySelector('.add-cal-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToCalendar(event);
        });
        card.addEventListener('click', () => openEventDetailModal(event.id));

        return card;
    }

    async function openEventDetailModal(eventId) {
        const modal = document.getElementById('project-detail-modal');
        if (!modal) return;
        try {
            const { data: event } = await supabaseAdmin
                .from('events')
                .select('*, avenues(name)')
                .eq('id', eventId)
                .single();
            if (!event) return;

            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val || '';
            };
            const posterEl = document.getElementById('modal-event-poster');
            if (posterEl) posterEl.src = event.poster_url || '';
            set('modal-event-name', event.event_name);
            set('modal-event-venue', event.venue || 'TBA');
            set('modal-event-chair', event.event_chair || 'TBA');
            set('modal-event-proposer', event.event_proposed_by || 'N/A');
            set('modal-event-seconder', event.event_seconded_by || 'N/A');
            set('modal-event-description', event.description || '');
            set('modal-event-avenue-badge', event.avenues?.name || '');

            const dateStr = new Date(event.date).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
            set('modal-event-date-time', dateStr + (event.start_time ? ' | ' + formatTime(event.start_time) : ''));

            const collabEl = document.getElementById('modal-event-collaborations');
            if (collabEl) {
                collabEl.textContent = event.has_collaboration
                    ? 'In collaboration with ' + (event.collaborator_name || '')
                    : '';
                collabEl.style.display = event.has_collaboration ? '' : 'none';
            }

            const dppEl = document.getElementById('modal-dpp-specs');
            if (dppEl) {
                if (event.is_dpp) {
                    dppEl.classList.remove('hidden');
                    set('modal-dpp-no', event.dpp_project_number);
                    set('modal-dpp-pillar', event.dpp_pillar);
                    set('modal-dpp-category', event.dpp_category);
                } else {
                    dppEl.classList.add('hidden');
                }
            }

            const calBtn = document.getElementById('modal-btn-add-cal');
            if (calBtn) calBtn.onclick = () => addToCalendar(event);

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } catch (e) {
            Toast.error('Failed to load event.');
        }
    }

    function closeEventDetailModal() {
        const modal = document.getElementById('project-detail-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    function addToCalendar(event) {
        const title = encodeURIComponent(event.event_name || '');
        const date = (event.date || '').replace(/-/g, '');
        const st = (event.start_time || '000000').replace(/:/g, '').substring(0, 6);
        const et = event.end_time
            ? (event.end_time.replace(/:/g, '').substring(0, 6))
            : String(parseInt(st.substring(0, 2)) + 2).padStart(2, '0') + st.substring(2);
        window.open(
            'https://calendar.google.com/calendar/event?action=TEMPLATE&text=' + title +
            '&dates=' + date + 'T' + st + '/' + date + 'T' + et +
            '&details=' + encodeURIComponent((event.description || '') + '\n\nRotaract Club of Coimbatore Unity') +
            '&location=' + encodeURIComponent(event.venue || ''),
            '_blank'
        );
        Toast.success('Opening Google Calendar...');
    }
    window.addToCalendar = addToCalendar;

    async function loadTimeline() {
        const container = document.getElementById('timeline-flow-container');
        if (!container) return;
        try {
            const [{ data: presidents }, { data: secretaries }] = await Promise.all([
                supabaseAdmin.from('past_presidents').select('*').order('rotary_year', { ascending: false }),
                supabaseAdmin.from('past_secretaries').select('*').order('rotary_year', { ascending: false })
            ]);
            const yearMap = {};
            (presidents || []).forEach(p => {
                if (!yearMap[p.rotary_year]) yearMap[p.rotary_year] = { president: null, secretaries: [] };
                yearMap[p.rotary_year].president = p;
            });
            (secretaries || []).forEach(s => {
                if (!yearMap[s.rotary_year]) yearMap[s.rotary_year] = { president: null, secretaries: [] };
                yearMap[s.rotary_year].secretaries.push(s);
            });
            const years = Object.keys(yearMap).sort((a, b) => b.localeCompare(a));
            container.innerHTML = '';
            if (!years.length) {
                container.innerHTML = '<div class="empty-state py-16"><i class="fa-solid fa-timeline empty-state-icon"></i><h4 class="empty-state-title">Heritage Coming Soon</h4></div>';
                return;
            }
            years.forEach(year => {
                const entry = yearMap[year];
                const node = document.createElement('div');
                node.className = 'timeline-node president reveal-left';
                let presHtml = '', secHtml = '';
                if (entry.president) {
                    const p = entry.president;
                    const photo = p.photo_url ? Uploader.getThumbnailUrl(p.photo_url, 'cloudinary', 96) : '';
                    presHtml = '<div class="flex items-center gap-4 mb-3">' +
                        (photo
                            ? '<img src="' + photo + '" class="timeline-photo" loading="lazy">'
                            : '<div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center"><i class="fa-solid fa-user text-blue-500"></i></div>') +
                        '<div><h4 class="text-sm font-bold">' + escapeHtml(p.full_name) + '</h4><span class="badge badge-blue">President</span>' +
                        (p.ri_id ? '<span class="text-[9px] text-slate-400 ml-2">RI ID: ' + escapeHtml(p.ri_id) + '</span>' : '') +
                        '</div></div>';
                }
                entry.secretaries.forEach(s => {
                    const sPhoto = s.photo_url ? Uploader.getThumbnailUrl(s.photo_url, 'cloudinary', 96) : '';
                    const label = s.secretary_type === 'communication'
                        ? 'Secretary Communication'
                        : s.secretary_type === 'administration'
                            ? 'Secretary Administration'
                            : 'Secretary';
                    secHtml += '<div class="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">' +
                        (sPhoto
                            ? '<img src="' + sPhoto + '" class="timeline-photo" loading="lazy">'
                            : '<div class="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center"><i class="fa-solid fa-user text-purple-500"></i></div>') +
                        '<div><h4 class="text-sm font-bold">' + escapeHtml(s.full_name) + '</h4><span class="badge badge-purple">' + label + '</span>' +
                        (s.ri_id ? '<span class="text-[9px] text-slate-400 ml-2">RI ID: ' + escapeHtml(s.ri_id) + '</span>' : '') +
                        '</div></div>';
                });
                node.innerHTML =
                    '<div class="timeline-year-badge"><i class="fa-regular fa-calendar"></i> ' + escapeHtml(year) + '</div>' +
                    '<div class="timeline-card">' + presHtml + secHtml +
                    (!entry.president && !entry.secretaries.length ? '<p class="text-xs text-slate-400">Coming soon</p>' : '') +
                    '</div>';
                container.appendChild(node);
            });
        } catch (e) {
            container.innerHTML = '<p class="text-xs text-slate-500 text-center py-8">Failed to load timeline.</p>';
        }
    }

    async function loadTrainers() {
        const container = document.getElementById('trainers-grid');
        if (!container) return;
        try {
            const { data } = await supabaseAdmin
                .from('club_trainers')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');
            container.innerHTML = '';
            if (!data || !data.length) {
                container.innerHTML = '<div class="col-span-full empty-state py-12"><i class="fa-solid fa-chalkboard-user empty-state-icon"></i><h4 class="empty-state-title">Trainers Coming Soon</h4></div>';
                return;
            }
            data.forEach(t => {
                const photo = t.photo_url ? Uploader.getThumbnailUrl(t.photo_url, 'cloudinary', 200) : '';
                const card = document.createElement('div');
                card.className = 'trainer-card reveal';
                card.innerHTML =
                    (photo
                        ? '<img src="' + photo + '" class="trainer-photo" loading="lazy">'
                        : '<div class="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-user-graduate text-3xl text-blue-500"></i></div>') +
                    '<h4 class="text-sm font-bold mb-1">' + escapeHtml(t.full_name) + '</h4>' +
                    (t.ri_id ? '<p class="text-[10px] text-slate-400 mb-2">RI ID: ' + escapeHtml(t.ri_id) + '</p>' : '') +
                    '<p class="text-xs text-blue-500 font-semibold mb-1">' + escapeHtml(t.area_of_expertise || '') + '</p>' +
                    (t.certified_year ? '<p class="text-[10px] text-slate-500">Certified: ' + escapeHtml(t.certified_year) + '</p>' : '') +
                    (t.email ? '<p class="text-[10px] text-slate-400 mt-2"><i class="fa-solid fa-envelope mr-1"></i>' + escapeHtml(t.email) + '</p>' : '');
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = '<p class="text-xs text-slate-500 text-center col-span-full py-8">Failed to load trainers.</p>';
        }
    }

    async function loadMembers() {
        const container = document.getElementById('members-grid');
        if (!container) return;
        container.innerHTML = renderSkeletonCards(8);
        try {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, portfolio, photo_url, ri_id, blood_group, phone, email, role')
                .eq('is_active', true)
                .neq('role', 'super_admin');
            const order = {
                president: 1, ipp: 2, vice_president: 3,
                secretary: 4, secretary_admin: 5, secretary_comm: 6,
                treasurer: 7, advisor: 8,
                avenue_director: 9, avenue_chair: 10,
                dpp_chair: 11, blood_donor_chair: 12, club_editor: 13,
                young_leaders_contact: 14, public_image_chair: 15,
                membership_chair: 16, trf_chair: 17, board_member: 18, member: 19
            };
            const sorted = (data || []).sort((a, b) =>
                (order[a.role] || 99) - (order[b.role] || 99) || a.full_name.localeCompare(b.full_name)
            );
            window._allMembers = sorted;
            renderMembers(sorted);
        } catch (e) {
            container.innerHTML = '<p class="text-xs text-slate-500 text-center col-span-full py-8">Failed to load members.</p>';
        }
    }

    function renderMembers(members) {
        const container = document.getElementById('members-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!members.length) {
            container.innerHTML = '<div class="col-span-full empty-state py-12"><i class="fa-solid fa-users empty-state-icon"></i><h4 class="empty-state-title">No Members Found</h4></div>';
            return;
        }
        members.forEach(m => {
            const photo = m.photo_url ? Uploader.getThumbnailUrl(m.photo_url, 'cloudinary', 200) : '';
            const card = document.createElement('div');
            card.className = 'member-card reveal';
            card.innerHTML =
                '<div class="flex items-start gap-4 mb-3">' +
                (photo
                    ? '<img src="' + photo + '" class="member-photo" loading="lazy">'
                    : '<div class="member-photo bg-blue-500/10 flex items-center justify-center"><i class="fa-solid fa-user text-xl text-blue-500"></i></div>') +
                '<div class="flex-1 min-w-0">' +
                '<h4 class="text-sm font-bold truncate">' + escapeHtml(m.full_name) + '</h4>' +
                '<p class="text-[10px] text-blue-500 font-semibold">' + escapeHtml(m.portfolio || formatRoleName(m.role)) + '</p>' +
                (m.ri_id ? '<p class="text-[9px] text-slate-400 mt-1">RI ID: ' + escapeHtml(m.ri_id) + '</p>' : '') +
                '</div>' +
                (m.blood_group ? '<span class="member-blood-badge">' + escapeHtml(m.blood_group) + '</span>' : '') +
                '</div>' +
                '<div class="flex items-center gap-4 text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-white/[0.06]">' +
                (m.phone ? '<span class="flex items-center gap-1"><i class="fa-solid fa-phone"></i> ' + escapeHtml(m.phone) + '</span>' : '') +
                (m.email ? '<span class="flex items-center gap-1 truncate"><i class="fa-solid fa-envelope"></i> ' + escapeHtml(m.email) + '</span>' : '') +
                '</div>';
            container.appendChild(card);
        });
    }

    function initMemberSearch() {
        const search = document.getElementById('member-search-input');
        const blood = document.getElementById('member-filter-blood');
        let timer;
        const filter = () => {
            const q = (search?.value || '').toLowerCase().trim();
            const bg = blood?.value || '';
            renderMembers((window._allMembers || []).filter(m =>
                (!q ||
                    (m.full_name || '').toLowerCase().includes(q) ||
                    (m.portfolio || '').toLowerCase().includes(q) ||
                    (m.ri_id || '').toLowerCase().includes(q) ||
                    (m.email || '').toLowerCase().includes(q)
                ) && (!bg || m.blood_group === bg)
            ));
        };
        if (search) search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(filter, 300);
        });
        if (blood) blood.addEventListener('change', filter);
    }

    async function loadBulletins() {
        const container = document.getElementById('bulletins-grid');
        if (!container) return;
        try {
            const { data } = await supabaseAdmin
                .from('bulletins')
                .select('*')
                .eq('published', true)
                .order('created_at', { ascending: false })
                .limit(6);
            container.innerHTML = '';
            if (!data || !data.length) {
                container.innerHTML = '<div class="col-span-full empty-state py-12"><i class="fa-solid fa-newspaper empty-state-icon"></i><h4 class="empty-state-title">Bulletins Coming Soon</h4></div>';
                return;
            }
            data.forEach(b => {
                const cover = b.cover_image_url ? Uploader.getThumbnailUrl(b.cover_image_url, b.cover_provider || 'cloudinary', 400) : '';
                const card = document.createElement('div');
                card.className = 'bulletin-card reveal';
                card.innerHTML =
                    '<div class="relative overflow-hidden">' +
                    (cover
                        ? '<img src="' + cover + '" class="bulletin-cover" loading="lazy">'
                        : '<div class="bulletin-cover bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center"><i class="fa-solid fa-newspaper text-4xl text-white/50"></i></div>') +
                    '</div>' +
                    '<div class="p-5">' +
                    '<h4 class="text-sm font-bold mb-1 truncate">' + escapeHtml(b.bulletin_name) + '</h4>' +
                    (b.edition ? '<p class="text-[10px] text-slate-500 mb-2">' + escapeHtml(b.edition) + '</p>' : '') +
                    (b.description ? '<p class="text-xs text-slate-400 truncate-2 mb-3">' + escapeHtml(b.description) + '</p>' : '') +
                    (b.drive_link
                        ? '<a href="' + escapeHtml(b.drive_link) + '" target="_blank" rel="noopener" class="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"><i class="fa-solid fa-arrow-up-right-from-square"></i> Read Bulletin</a>'
                        : '') +
                    '</div>';
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = '<p class="text-xs text-slate-500 text-center col-span-full py-8">Failed to load bulletins.</p>';
        }
    }

    // ==========================================
    // 13. FORMS
    // ==========================================
    function initBloodRequestForm() {
        const form = document.getElementById('blood-request-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Triggering...';
            try {
                await supabaseAdmin.from('blood_requests').insert({
                    patient_name: fd.get('patient_name'),
                    blood_group: fd.get('blood_group'),
                    units_needed: parseInt(fd.get('units_needed')) || 1,
                    hospital_name: fd.get('hospital_details'),
                    contact_person: fd.get('contact_person'),
                    contact_phone: fd.get('contact_phone'),
                    urgency: fd.get('urgency'),
                    status: 'active'
                });
                const msg = encodeURIComponent(
                    '*EMERGENCY BLOOD REQUEST*\n\n' +
                    'Patient: ' + fd.get('patient_name') + '\n' +
                    'Blood Group: ' + fd.get('blood_group') + '\n' +
                    'Units: ' + fd.get('units_needed') + '\n' +
                    'Urgency: ' + fd.get('urgency').toUpperCase() + '\n' +
                    'Hospital: ' + fd.get('hospital_details') + '\n' +
                    'Contact: ' + fd.get('contact_person') + ' (' + fd.get('contact_phone') + ')\n\n' +
                    'Sent via Rotaract Club of Coimbatore Unity'
                );
                const p1 = Settings.get('blood_request_whatsapp_1', '9789903206');
                const p2 = Settings.get('blood_request_whatsapp_2', '9789953206');
                window.open('https://wa.me/91' + p1 + '?text=' + msg, '_blank');
                setTimeout(() => window.open('https://wa.me/91' + p2 + '?text=' + msg, '_blank'), 1500);
                Toast.success('Emergency alerts triggered!');
                form.reset();
            } catch (err) {
                Toast.error('Failed. Call emergency numbers directly.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i>Trigger Emergency Desk';
            }
        });
    }

    function initMembershipForm() {
        const form = document.getElementById('membership-join-form');
        const fileInput = document.getElementById('member-photo-upload');
        const label = document.getElementById('photo-file-name');
        let photoUrl = '';
        let photoMeta = { provider: null, publicId: null };

        if (fileInput && label) {
            fileInput.addEventListener('change', async function () {
                if (this.files && this.files[0]) {
                    label.textContent = this.files[0].name;
                    try {
                        const r = await Uploader.upload(this.files[0], { type: 'profile', folder: 'applications' });
                        photoUrl = r.url;
                        photoMeta = { provider: r.provider || null, publicId: r.publicId || null };
                        label.textContent = 'Uploaded';
                        Toast.success('Photo uploaded!');
                    } catch (e) {
                        label.textContent = 'Failed';
                        Toast.error('Upload failed');
                    }
                }
            });
        }

        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Processing...';
            try {
                await supabaseAdmin.from('membership_applications').insert({
                    full_name: fd.get('full_name'),
                    email: String(fd.get('email') || '').trim().toLowerCase(),
                    phone: String(fd.get('phone') || '').trim(),
                    date_of_birth: fd.get('dob') || null,
                    blood_group: fd.get('blood_group') || null,
                    photo_url: photoUrl || null,
                    photo_public_id: photoMeta.publicId,
                    photo_provider: photoMeta.provider || 'cloudinary',
                    profession: fd.get('profession') || null,
                    address: String(fd.get('address') || '').trim() || null,
                    why_join: String(fd.get('why_join') || '').trim() || null,
                    referral_source: String(fd.get('referral_source') || '').trim() || null,
                    status: 'pending'
                });
                Toast.success('Application submitted! Membership chair will contact you.');
                form.reset();
                if (label) label.textContent = 'Upload portrait';
                photoUrl = '';
                photoMeta = { provider: null, publicId: null };
            } catch (e) {
                Toast.error(/duplicate|unique/i.test(e.message || '')
                    ? 'An application with this email already exists.'
                    : 'Failed. Email rc.cbeunity@gmail.com');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2 text-blue-500"></i>Submit Enrollment Proposal';
            }
        });
    }

    // ==========================================
    // 14. ADMIN PORTAL & MODAL HANDLERS
    // ==========================================
    function initAdminPortalTriggers() {
        const openAuth = () => {
            if (window.AuthManager && window.AuthManager.isLoggedIn()) openAdminPortal();
            else {
                const m = document.getElementById('auth-dialog-modal');
                if (m) {
                    m.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                }
            }
        };

        const openAdminPortal = () => {
            const p = document.getElementById('admin-portal-modal');
            if (p) {
                p.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                if (window.AdminPanel) window.AdminPanel.init();
            }
        };
        window.openAdminPortal = openAdminPortal;

        ['nav-admin-btn', 'mobile-portal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', openAuth);
        });

        const closePortal = document.getElementById('admin-portal-close');
        if (closePortal) closePortal.addEventListener('click', () => {
            const p = document.getElementById('admin-portal-modal');
            if (p) {
                p.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });

        const closeAuth = document.getElementById('auth-modal-close');
        if (closeAuth) closeAuth.addEventListener('click', () => {
            const m = document.getElementById('auth-dialog-modal');
            if (m) {
                m.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });

        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            if (window.AuthManager) window.AuthManager.logout();
            const p = document.getElementById('admin-portal-modal');
            if (p) p.classList.add('hidden');
            document.body.style.overflow = '';
            Toast.info('Logged out.');
        });
    }

    function initModalHandlers() {
        const closeBtn = document.getElementById('modal-project-close');
        if (closeBtn) closeBtn.addEventListener('click', closeEventDetailModal);
        const modal = document.getElementById('project-detail-modal');
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEventDetailModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeEventDetailModal();
                const auth = document.getElementById('auth-dialog-modal');
                if (auth && !auth.classList.contains('hidden')) {
                    auth.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }
        });
    }

    // ==========================================
    // 15. KEYBOARD SHORTCUTS
    // ==========================================
    function initKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                const auth = document.getElementById('auth-dialog-modal');
                if (window.AuthManager && window.AuthManager.isLoggedIn()) {
                    window.openAdminPortal();
                } else if (auth) {
                    auth.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                }
            }
            if (e.key === 't' && !e.ctrlKey && !e.altKey && !isInputFocused()) Theme.toggle();
        });
    }

    function isInputFocused() {
        const a = document.activeElement;
        return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
    }

    // ==========================================
    // 16. SECTION VISIBILITY & FOOTER
    // ==========================================
    async function applySectionVisibility() {
        try {
            const { data } = await supabaseAdmin
                .from('website_sections')
                .select('section_key, is_visible');
            (data || []).forEach(s => {
                if (!s.is_visible) {
                    const el = document.getElementById(s.section_key);
                    if (el) el.style.display = 'none';
                }
            });
        } catch (e) { /* silent */ }
    }

    function updateFooterData() {
        const email = Settings.get('club_email', 'rc.cbeunity@gmail.com');
        const mapUrl = Settings.get('map_embed_url');
        document.querySelectorAll('a[href="mailto:rc.cbeunity@gmail.com"]').forEach(l => {
            l.href = 'mailto:' + email;
        });
        if (mapUrl) {
            const iframe = document.querySelector('footer iframe');
            if (iframe) iframe.src = mapUrl;
        }
    }

    // ==========================================
    // 17. SECRETARY & ROLE HELPERS
    // ==========================================
    function isSecretaryRole(role) {
        return ['secretary', 'secretary_admin', 'secretary_comm'].includes(role);
    }

    function isExecutiveRole(role) {
        return ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm'].includes(role);
    }

    function canApprove(role) {
        return isExecutiveRole(role);
    }

    function canAccessTreasury(role, full) {
        if (['treasurer', 'super_admin', 'advisor'].includes(role)) return true;
        if (full) return false;
        return isExecutiveRole(role);
    }

    async function getSecretaryConfig() {
        try {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, role, portfolio, photo_url, ri_id, email, phone')
                .in('role', ['secretary', 'secretary_admin', 'secretary_comm'])
                .eq('is_active', true);

            let yearCfg = null;
            try {
                const y = await supabaseAdmin
                    .from('club_year_config')
                    .select('*')
                    .eq('rotary_year', getRotaryYear())
                    .maybeSingle();
                yearCfg = y.data;
            } catch (e) { /* silent */ }

            const cfg = {
                mode: 'none',
                hasDualSecretary: false,
                hasSingleSecretary: false,
                secretaryAdmin: null,
                secretaryComm: null,
                singleSecretary: null,
                allSecretaries: [],
                secretaryEmails: [],
                yearConfig: yearCfg
            };

            if (!data || !data.length) {
                window._secretaryConfig = cfg;
                return cfg;
            }

            cfg.allSecretaries = data;
            cfg.secretaryEmails = data.map(s => s.email).filter(Boolean);
            const single = data.find(s => s.role === 'secretary');
            const admin = data.find(s => s.role === 'secretary_admin');
            const comm = data.find(s => s.role === 'secretary_comm');

            if (admin && comm) {
                cfg.mode = 'dual';
                cfg.hasDualSecretary = true;
                cfg.secretaryAdmin = admin;
                cfg.secretaryComm = comm;
            } else if (single) {
                cfg.mode = 'single';
                cfg.hasSingleSecretary = true;
                cfg.singleSecretary = single;
                cfg.secretaryAdmin = single;
            } else if (admin) {
                cfg.mode = 'single';
                cfg.hasSingleSecretary = true;
                cfg.singleSecretary = admin;
                cfg.secretaryAdmin = admin;
            } else if (comm) {
                cfg.mode = 'single';
                cfg.hasSingleSecretary = true;
                cfg.singleSecretary = comm;
                cfg.secretaryComm = comm;
            }

            window._secretaryConfig = cfg;
            return cfg;
        } catch (e) {
            return {
                mode: 'none',
                hasDualSecretary: false,
                hasSingleSecretary: false,
                secretaryAdmin: null,
                secretaryComm: null,
                singleSecretary: null,
                allSecretaries: [],
                secretaryEmails: [],
                yearConfig: null
            };
        }
    }

    async function getOfficeBearers() {
        const cached = Cache.get('office_bearers');
        if (cached) return cached;
        try {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, role, portfolio, photo_url, ri_id, email, phone')
                .in('role', [
                    'president', 'ipp', 'vice_president',
                    'secretary', 'secretary_admin', 'secretary_comm',
                    'treasurer', 'advisor', 'dpp_chair', 'blood_donor_chair',
                    'club_editor', 'young_leaders_contact', 'public_image_chair',
                    'membership_chair', 'trf_chair'
                ])
                .eq('is_active', true);
            const b = {};
            (data || []).forEach(u => { b[u.role] = u; });
            Cache.set('office_bearers', b, 30);
            window._officeBearers = b;
            return b;
        } catch (e) {
            return {};
        }
    }

    async function getReportSignatories() {
        const bearers = await getOfficeBearers();
        const sec = await getSecretaryConfig();
        const sig = {
            mode: sec.mode,
            columns: sec.hasDualSecretary ? 3 : 2,
            left: null,
            center: null,
            right: null
        };
        if (sec.hasDualSecretary) {
            sig.left = {
                name: sec.secretaryAdmin?.full_name || '',
                portfolio: sec.secretaryAdmin?.portfolio || 'Secretary Administration'
            };
            sig.center = {
                name: bearers.president?.full_name || '',
                portfolio: bearers.president?.portfolio || 'President'
            };
            sig.right = {
                name: sec.secretaryComm?.full_name || '',
                portfolio: sec.secretaryComm?.portfolio || 'Secretary Communication'
            };
        } else if (sec.hasSingleSecretary) {
            sig.left = {
                name: sec.singleSecretary?.full_name || '',
                portfolio: sec.singleSecretary?.portfolio || 'Secretary'
            };
            sig.center = {
                name: bearers.president?.full_name || '',
                portfolio: bearers.president?.portfolio || 'President'
            };
        } else {
            sig.columns = 1;
            sig.center = {
                name: bearers.president?.full_name || '',
                portfolio: bearers.president?.portfolio || 'President'
            };
        }
        return sig;
    }

    async function getEmailRecipients(type) {
        const bearers = await getOfficeBearers();
        const sec = await getSecretaryConfig();
        const r = {
            president: bearers.president?.email,
            ipp: bearers.ipp?.email,
            vp: bearers.vice_president?.email,
            treasurer: bearers.treasurer?.email,
            advisor: bearers.advisor?.email,
            secretaries: sec.secretaryEmails
        };
        let emails = [];
        switch (type) {
            case 'approval':
                [r.president, r.ipp, r.vp].filter(Boolean).forEach(e => emails.push(e));
                emails = emails.concat(r.secretaries);
                break;
            case 'board':
                const bd = await getBoardMembers();
                emails = bd.map(b => b.email).filter(Boolean);
                break;
            case 'all_members':
                const all = await getAllActiveMembers();
                emails = all.map(m => m.email).filter(Boolean);
                break;
            case 'secretariat':
                emails = r.secretaries;
                break;
            case 'executive':
                Object.keys(r).forEach(k => {
                    if (k === 'secretaries') emails = emails.concat(r[k]);
                    else if (r[k]) emails.push(r[k]);
                });
                break;
            case 'treasury':
                [r.treasurer, r.president].filter(Boolean).forEach(e => emails.push(e));
                emails = emails.concat(r.secretaries);
                break;
        }
        return [...new Set(emails)];
    }

    async function getBoardMembers() {
        try {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email, role, portfolio')
                .eq('is_active', true)
                .eq('is_board_member', true)
                .neq('role', 'super_admin');
            return data || [];
        } catch (e) {
            return [];
        }
    }

    async function getAllActiveMembers() {
        try {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email, role, portfolio, phone, date_of_birth, blood_group')
                .eq('is_active', true)
                .neq('role', 'super_admin');
            return data || [];
        } catch (e) {
            return [];
        }
    }

    async function getYearConfig(year) {
        year = year || getRotaryYear();
        try {
            const { data } = await supabaseAdmin
                .from('club_year_config')
                .select('*')
                .eq('rotary_year', year)
                .maybeSingle();
            return data || { rotary_year: year, has_dual_secretary: true };
        } catch (e) {
            return { rotary_year: year, has_dual_secretary: true };
        }
    }

    const AVAILABLE_ROLES = [
        { value: 'super_admin', label: 'Super Administrator', tier: 'executive' },
        { value: 'advisor', label: 'Club Advisor', tier: 'executive' },
        { value: 'president', label: 'President', tier: 'executive' },
        { value: 'ipp', label: 'Immediate Past President', tier: 'executive' },
        { value: 'vice_president', label: 'Vice President', tier: 'executive' },
        { value: 'secretary', label: 'Secretary (Single)', tier: 'executive', hint: 'One secretary structure' },
        { value: 'secretary_admin', label: 'Secretary - Administration', tier: 'executive', hint: 'Dual structure' },
        { value: 'secretary_comm', label: 'Secretary - Communication', tier: 'executive', hint: 'Dual structure' },
        { value: 'treasurer', label: 'Treasurer', tier: 'board' },
        { value: 'dpp_chair', label: 'District Priority Projects Chair', tier: 'board' },
        { value: 'blood_donor_chair', label: 'Blood Donor Chair', tier: 'board' },
        { value: 'club_editor', label: 'Club Editor', tier: 'board' },
        { value: 'young_leaders_contact', label: 'Young Leaders Contact', tier: 'board' },
        { value: 'public_image_chair', label: 'Public Image Chair', tier: 'board' },
        { value: 'membership_chair', label: 'Membership Chair', tier: 'board' },
        { value: 'trf_chair', label: 'The Rotary Foundation Chair', tier: 'board' },
        { value: 'avenue_director', label: 'Avenue Director', tier: 'board', requiresAvenue: true },
        { value: 'avenue_chair', label: 'Avenue Chair', tier: 'board', requiresAvenue: true },
        { value: 'board_member', label: 'Board Member', tier: 'board' },
        { value: 'member', label: 'Member', tier: 'member' }
    ];

    // ==========================================
    // 18. UTILITIES
    // ==========================================
    function escapeHtml(t) {
        if (!t) return '';
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(t));
        return d.innerHTML;
    }

    function formatTime(t) {
        if (!t) return '';
        try {
            const p = t.split(':');
            let h = parseInt(p[0]);
            const m = p[1] || '00';
            return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
        } catch (e) {
            return t;
        }
    }

    function formatDate(d) {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch (e) {
            return d;
        }
    }

    function formatDateTime(d, t) {
        return formatDate(d) + (t ? ' at ' + formatTime(t) : '');
    }

    function formatRoleName(r) {
        return {
            super_admin: 'Super Administrator',
            president: 'President',
            ipp: 'Immediate Past President',
            vice_president: 'Vice President',
            secretary: 'Secretary',
            secretary_admin: 'Secretary Administration',
            secretary_comm: 'Secretary Communication',
            treasurer: 'Treasurer',
            advisor: 'Advisor',
            avenue_director: 'Avenue Director',
            avenue_chair: 'Avenue Chair',
            dpp_chair: 'District Priority Projects Chair',
            blood_donor_chair: 'Blood Donor Chair',
            club_editor: 'Club Editor',
            young_leaders_contact: 'Young Leaders Contact',
            public_image_chair: 'Public Image Chair',
            membership_chair: 'Membership Chair',
            trf_chair: 'The Rotary Foundation Chair',
            board_member: 'Board Member',
            member: 'Member'
        }[r] || (r || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function formatCurrency(a) {
        return 'Rs. ' + (parseFloat(a) || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    function timeAgo(d) {
        const s = Math.floor((Date.now() - new Date(d)) / 1000);
        if (s < 60) return 'Just now';
        const m = Math.floor(s / 60);
        if (m < 60) return m + 'm ago';
        const h = Math.floor(m / 60);
        if (h < 24) return h + 'h ago';
        const days = Math.floor(h / 24);
        return days < 30 ? days + 'd ago' : Math.floor(days / 30) + 'mo ago';
    }

    function getRotaryYear() {
        const now = new Date();
        const y = now.getFullYear();
        return now.getMonth() < 6
            ? (y - 1) + '-' + String(y).slice(2)
            : y + '-' + String(y + 1).slice(2);
    }

    function debounce(fn, d) {
        let t;
        return function () {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, arguments), d);
        };
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function deepClone(o) {
        return JSON.parse(JSON.stringify(o));
    }

    function renderSkeletonCards(n) {
        let h = '';
        for (let i = 0; i < n; i++) {
            h += '<div class="rounded-2xl border border-slate-100/60 dark:border-white/[0.04] overflow-hidden">' +
                '<div class="skeleton-line w-full" style="height:210px;border-radius:0;"></div>' +
                '<div class="p-5 space-y-3">' +
                '<div class="skeleton-line w-25" style="height:16px;"></div>' +
                '<div class="skeleton-line h-lg w-75"></div>' +
                '<div class="skeleton-line w-50"></div>' +
                '</div></div>';
        }
        return h;
    }

    // ==========================================
    // 19. BACKGROUND TASKS
    // ==========================================
    async function runBackgroundTasks() {
        const last = localStorage.getItem('unity_last_cleanup');
        const today = new Date().toISOString().split('T')[0];
        if (last === today) return;
        try {
            await supabaseAdmin.rpc('run_daily_cleanup');
            await supabaseAdmin.rpc('update_club_statistics');
            await supabaseAdmin.rpc('cleanup_expired_cache');
            localStorage.setItem('unity_last_cleanup', today);
        } catch (e) { /* silent */ }
    }

    function initConnectivity() {
        window.addEventListener('online', () => Toast.success('Connection restored.'));
        window.addEventListener('offline', () => Toast.warning('You are offline.'));
    }

    // ==========================================
    // 20. BOOT SEQUENCE
    // ==========================================
    async function boot() {
        Loader.init();

        const tasks = [
            { name: 'Supabase', fn: () => { if (!initSupabase()) throw new Error('DB init failed'); } },
            { name: 'Theme', fn: () => Theme.init() },
            { name: 'Toast', fn: () => Toast.init() },
            { name: 'Navigation', fn: () => Navigation.init() },
            { name: 'Settings', fn: () => Settings.loadAll() },
            { name: 'Upload Engine', fn: () => Uploader.init() },
            { name: 'Statistics', fn: () => loadStatistics() },
            { name: 'Benefits', fn: () => loadBenefits() },
            { name: 'Events', fn: () => loadUpcomingEvents() },
            { name: 'Timeline', fn: () => loadTimeline() },
            { name: 'Trainers', fn: () => loadTrainers() },
            { name: 'Members', fn: () => loadMembers() },
            { name: 'Bulletins', fn: () => loadBulletins() },
            { name: 'Secretary Config', fn: () => getSecretaryConfig() },
            { name: 'Office Bearers', fn: () => getOfficeBearers() },
            { name: 'Section Visibility', fn: () => applySectionVisibility() },
            { name: 'Completed Events', fn: () => CompletedEvents.init() },
            { name: 'Member Search', fn: () => initMemberSearch() },
            { name: 'Blood Form', fn: () => initBloodRequestForm() },
            { name: 'Membership Form', fn: () => initMembershipForm() },
            { name: 'Admin Portal', fn: () => initAdminPortalTriggers() },
            { name: 'Modals', fn: () => initModalHandlers() },
            { name: 'Keyboard', fn: () => initKeyboard() },
            { name: 'Footer', fn: () => updateFooterData() },
            { name: 'Connectivity', fn: () => initConnectivity() },
            { name: 'Scroll Effects', fn: () => ScrollFX.init() },
            { name: 'Background Tasks', fn: () => runBackgroundTasks() }
        ];

        try {
            await Loader.runTasks(tasks);
        } catch (e) {
            console.error('[Boot] Error:', e);
        }

        Loader.hide();
    }

    // Prevent duplicate initialization
    if (!window._appInitialized) {
        window._appInitialized = true;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    }

    // ==========================================
    // 21. GLOBAL EXPORTS
    // ==========================================
    window.AppConfig = CONFIG;
    window.AppCache = Cache;
    window.SiteSettings = Settings;
    window.AppTheme = Theme;
    window.UnityStats = UnityStats;
    window.AppToast = Toast;
    window.AppUploader = Uploader;
    window.ImageCompressor = ImageCompressor;
    window.openEventDetailModal = openEventDetailModal;
    window.closeEventDetailModal = closeEventDetailModal;
    window.CompletedEvents = CompletedEvents;
    window.escapeHtml = escapeHtml;
    window.formatTime = formatTime;
    window.formatDate = formatDate;
    window.formatDateTime = formatDateTime;
    window.formatRoleName = formatRoleName;
    window.formatCurrency = formatCurrency;
    window.timeAgo = timeAgo;
    window.getRotaryYear = getRotaryYear;
    window.debounce = debounce;
    window.generateUUID = generateUUID;
    window.deepClone = deepClone;
    window.renderSkeletonCards = renderSkeletonCards;
    window.isSecretaryRole = isSecretaryRole;
    window.isExecutiveRole = isExecutiveRole;
    window.canApprove = canApprove;
    window.canAccessTreasury = canAccessTreasury;
    window.getSecretaryConfig = getSecretaryConfig;
    window.getOfficeBearers = getOfficeBearers;
    window.getReportSignatories = getReportSignatories;
    window.getEmailRecipients = getEmailRecipients;
    window.getBoardMembers = getBoardMembers;
    window.getAllActiveMembers = getAllActiveMembers;
    window.getYearConfig = getYearConfig;
    window.AVAILABLE_ROLES = AVAILABLE_ROLES;

})();