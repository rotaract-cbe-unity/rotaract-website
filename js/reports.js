// ================================================================
// ROTARACT CLUB OF COIMBATORE UNITY
// ADVANCED REPORT GENERATION ENGINE
// File: js/reports.js | Version: 15.1.0
// Features: Custom Geo-Tag Entry | Google Maps URL Parser
// Premium Vector Icons (No Emojis) | DPP Category A/B/C
// Dignitaries & Guest Attendance (Council / Trainers) captured here
// Report email (PDF + geo-tagged photos + attendance) via Apps Script
// ================================================================

(function () {
    'use strict';

    const toast = window.AppToast || {
        success: (m) => alert('SUCCESS: ' + m),
        error: (m) => alert('ERROR: ' + m),
        warning: (m) => alert('WARNING: ' + m),
        info: (m) => alert('INFO: ' + m)
    };

    // ------------------------------------------------------------------
    // Mail service (Google Apps Script web app, Code.gs v4.1+)
    // POSTed as text/plain so the browser does not need a CORS preflight.
    // ------------------------------------------------------------------
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

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function getMemberRecipients() {
        try {
            if (window.getEmailRecipients) return (await window.getEmailRecipients('all_members')) || [];
            const db = window.DB_ADMIN || window.DB || window.supabaseClient;
            const { data } = await db.from('users').select('email').eq('is_active', true).neq('role', 'super_admin').not('email', 'is', null);
            return (data || []).map(u => u.email).filter(e => e && e.includes('@'));
        } catch (e) { console.warn('Recipient fetch failed:', e); return []; }
    }

    function currentSender() {
        const u = window.AuthManager?.currentUser || {};
        return { role: u.role, name: u.full_name || u.name, email: u.email };
    }

    const Reports = {
        // ==========================================
        // 1. STATE & CONFIGURATION
        // ==========================================
        currentEvent: null,
        currentMode: 'avenue',
        reportPhotos: [],
        minPhotos: 6,
        maxPhotos: 8,
        geoTaggingSupported: false,

        // Live GPS state
        liveLocation: null,
        liveLocationName: '',

        // Custom override state (NEW)
        geoTagMode: 'live',   // 'live' | 'custom'
        customLocation: null, // { latitude, longitude, address, city, state }
        customDateTime: null, // ISO string or null (uses now if null)
        activeLocation: null, // currently applied location (live or custom)
        activeLocationName: '',

        reportWizardStep: 1,
        autoSaveInterval: null,
        draftKey: null,

        AVENUE_CONFIG: {
            club_service: { color: '#E4345A', icon: 'fa-handshake', label: 'Club Service' },
            community_service: { color: '#10B981', icon: 'fa-hand-holding-heart', label: 'Community Service' },
            professional_service: { color: '#3B82F6', icon: 'fa-briefcase', label: 'Professional Service' },
            international_service: { color: '#8B5CF6', icon: 'fa-earth-americas', label: 'International Service' },
            dpp: { color: '#F59E0B', icon: 'fa-star', label: 'District Priority Project' }
        },

        DPP_PILLARS: [
            'Peace and Conflict Prevention',
            'Disease Prevention and Treatment',
            'Water and Sanitation',
            'Maternal and Child Health',
            'Basic Education and Literacy',
            'Economic and Community Development',
            'Environment',
            'Mental Health'
        ],

        DPP_CATEGORIES: [
            { value: 'A', label: 'Category A - Awareness & Education' },
            { value: 'B', label: 'Category B - Hands-On Direct Service' },
            { value: 'C', label: 'Category C - Sustainable Community Impact' }
        ],

        EDGE_PDF_URL: 'https://sbpwmkoxuokrscddhhuw.supabase.co/functions/v1/generate-pdf',
        EDGE_DOCX_URL: 'https://sbpwmkoxuokrscddhhuw.supabase.co/functions/v1/generate-docx',

        // ==========================================
        // 2. INIT & LIVE GPS TELEMETRY
        // ==========================================
        async init() {
            this.geoTaggingSupported = 'geolocation' in navigator;
            if (this.geoTaggingSupported) {
                await this.requestLiveGeoLocation();
            }
            this.applyActiveLocation();
            this.initAutoSave();
        },

        async requestLiveGeoLocation() {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    this.liveLocation = null;
                    resolve();
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        this.liveLocation = {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy
                        };
                        await this.reverseGeocodeLive();
                        resolve();
                    },
                    (err) => {
                        console.warn('GPS Telemetry Offline:', err.message);
                        this.liveLocation = null;
                        resolve();
                    },
                    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
                );
            });
        },

        async reverseGeocodeLive() {
            if (!this.liveLocation) return;
            try {
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.liveLocation.latitude}&lon=${this.liveLocation.longitude}&zoom=18`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await resp.json();
                if (data?.display_name) {
                    this.liveLocationName = data.display_name;
                    this.liveLocation.address = data.display_name;
                    this.liveLocation.city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Coimbatore';
                    this.liveLocation.state = data.address?.state || 'Tamil Nadu';
                }
            } catch (e) {
                this.liveLocationName = 'Coimbatore, Tamil Nadu';
            }
        },

        applyActiveLocation() {
            if (this.geoTagMode === 'custom' && this.customLocation) {
                this.activeLocation = this.customLocation;
                this.activeLocationName = this.customLocation.address || `${this.customLocation.city || 'Coimbatore'}, Tamil Nadu`;
            } else if (this.liveLocation) {
                this.activeLocation = this.liveLocation;
                this.activeLocationName = this.liveLocationName;
            } else {
                this.activeLocation = null;
                this.activeLocationName = '';
            }
        },

        initAutoSave() {
            if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = setInterval(() => {
                if (this.currentEvent && this.draftKey) this.autoSaveDraft();
            }, 15000);
        },

        autoSaveDraft() {
            const form = document.getElementById(this.currentMode === 'dpp' ? 'dpp-report-form' : 'avenue-report-form');
            if (!form) return;
            const fd = new FormData(form);
            const data = {};
            fd.forEach((v, k) => { data[k] = v; });
            const draft = {
                eventId: this.currentEvent.id,
                mode: this.currentMode,
                step: this.reportWizardStep,
                data: data,
                photos: this.reportPhotos,
                saved_at: new Date().toISOString()
            };
            try { localStorage.setItem(this.draftKey, JSON.stringify(draft)); } catch (e) {}
        },

        loadDraft(eventId) {
            try {
                const stored = localStorage.getItem(`report_draft_${eventId}`);
                return stored ? JSON.parse(stored) : null;
            } catch (e) { return null; }
        },

        clearDraft() {
            if (this.draftKey) localStorage.removeItem(this.draftKey);
        },

        // ==========================================
        // 2b. REPORT HELPERS (attendance, parsing, normalising)
        // ==========================================
        esc(v) {
            const A = window.AdminPanel;
            if (A && typeof A.esc === 'function') return A.esc(v == null ? '' : v);
            return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        },

        // Reads a stored JSON list (text or jsonb column) safely
        parseJsonList(value) {
            let v = value;
            try {
                if (typeof v === 'string' && v.trim()) v = JSON.parse(v);
                if (typeof v === 'string' && v.trim()) v = JSON.parse(v);
            } catch (e) { return []; }
            return Array.isArray(v) ? v.filter(x => x && x.name) : [];
        },

        // Report text is stored as markdown-ish sections; split it back so re-editing never duplicates content
        parseReportText(text) {
            const out = { objectives: '', description: '', impact: '', sustainability: '' };
            if (!text) return out;
            const re = /\*\*(Objectives|Description|Impact & Outcomes|Sustainability\/Follow-up):\*\*\n?/g;
            const marks = [];
            let m;
            while ((m = re.exec(text)) !== null) marks.push({ key: m[1], start: m.index, end: re.lastIndex });
            if (marks.length === 0) { out.description = String(text).trim(); return out; }
            const keyMap = { 'Objectives': 'objectives', 'Description': 'description', 'Impact & Outcomes': 'impact', 'Sustainability/Follow-up': 'sustainability' };
            marks.forEach((mk, i) => {
                const to = i + 1 < marks.length ? marks[i + 1].start : text.length;
                out[keyMap[mk.key]] = text.substring(mk.end, to).trim();
            });
            return out;
        },

        // Events saved by the event form store "Category A - Awareness..." while this form uses A / B / C
        normalizeDppCategory(value) {
            if (!value) return '';
            const str = String(value).trim();
            if (/^[ABC]$/i.test(str)) return str.toUpperCase();
            const m = str.match(/category\s*([ABC])\b/i);
            return m ? m[1].toUpperCase() : '';
        },

        // ---- Dignitaries & Guest Attendance (Council / Trainers / Rotarians / Interactors) ----
        renderAttendancePanel(event) {
            const council = this.parseJsonList(event.council_members_details);
            const trainers = this.parseJsonList(event.trainers_details);
            const num = (k) => this.esc(event[k] != null ? event[k] : 0);
            const rows = (type, list) => (list.length > 0 ? list : [{}]).map((p, i) => this.renderPersonRow(type, i, p)).join('');

            return `
                <div class="admin-panel mb-5">
                    <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-users"></i> Dignitaries &amp; Guest Attendance</h3></div>
                    <div class="admin-panel-body">
                        <div class="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/15 mb-5">
                            <p class="text-xs font-bold text-brand-blue mb-1"><i class="fa-solid fa-circle-info mr-1"></i> Record who actually attended</p>
                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                Enter how many council members, trainers, Rotarians and Interactors were present.
                                If council members or trainers attended, add their names and portfolios below.
                            </p>
                        </div>
                        <div class="admin-form-grid">
                            <div class="admin-form-group">
                                <label class="admin-form-label"><i class="fa-solid fa-user-tie text-brand-blue mr-1"></i> Council Members Present</label>
                                <input type="number" name="council_members_count" min="0" class="admin-form-input" value="${num('council_members_count')}" onchange="Reports.toggleDetailSection('council', this.value)">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label"><i class="fa-solid fa-chalkboard-user text-purple-500 mr-1"></i> Trainers Present</label>
                                <input type="number" name="trainers_count" min="0" class="admin-form-input" value="${num('trainers_count')}" onchange="Reports.toggleDetailSection('trainer', this.value)">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label"><i class="fa-solid fa-shield-halved text-green-600 mr-1"></i> Rotarians Present</label>
                                <input type="number" name="rotarians_count" min="0" class="admin-form-input" value="${num('rotarians_count')}">
                            </div>
                            <div class="admin-form-group">
                                <label class="admin-form-label"><i class="fa-solid fa-children text-orange-500 mr-1"></i> Interactors Present</label>
                                <input type="number" name="interactors_count" min="0" class="admin-form-input" value="${num('interactors_count')}">
                            </div>
                        </div>

                        <div class="mt-5 ${(parseInt(event.council_members_count, 10) || 0) > 0 || council.length ? '' : 'hidden'}" id="council-details-section">
                            <div class="flex items-center justify-between mb-3">
                                <p class="text-xs font-black text-brand-blue"><i class="fa-solid fa-user-tie mr-1"></i> Council Members Details</p>
                                <button type="button" class="btn-secondary btn-xs" onclick="Reports.addPersonRow('council')"><i class="fa-solid fa-plus mr-1"></i> Add Member</button>
                            </div>
                            <div id="council-details-container">${rows('council', council)}</div>
                        </div>

                        <div class="mt-5 ${(parseInt(event.trainers_count, 10) || 0) > 0 || trainers.length ? '' : 'hidden'}" id="trainer-details-section">
                            <div class="flex items-center justify-between mb-3">
                                <p class="text-xs font-black text-purple-600"><i class="fa-solid fa-chalkboard-user mr-1"></i> Trainers Details</p>
                                <button type="button" class="btn-secondary btn-xs" onclick="Reports.addPersonRow('trainer')"><i class="fa-solid fa-plus mr-1"></i> Add Trainer</button>
                            </div>
                            <div id="trainer-details-container">${rows('trainer', trainers)}</div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderPersonRow(type, index, data) {
            const nameVal = this.esc(data && data.name || '');
            const portfolioVal = this.esc(data && data.portfolio || '');
            const label = type === 'council' ? 'Council Member' : 'Trainer';
            return `
                <div class="flex items-center gap-3 mb-3 ${type}-person-row" id="${type}-row-${index}">
                    <div class="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <span class="person-index text-[10px] font-bold text-brand-blue">${index + 1}</span>
                    </div>
                    <div class="flex-1">
                        <input type="text" class="admin-form-input" placeholder="${label} Full Name" value="${nameVal}" data-type="${type}" data-index="${index}" data-field="name">
                    </div>
                    <div class="flex-1">
                        <input type="text" class="admin-form-input" placeholder="Portfolio / Designation" value="${portfolioVal}" data-type="${type}" data-index="${index}" data-field="portfolio">
                    </div>
                    <button type="button" class="btn-danger btn-xs flex-shrink-0" onclick="Reports.removePersonRow('${type}', ${index})" title="Remove">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        },

        addPersonRow(type) {
            const container = document.getElementById(`${type}-details-container`);
            if (!container) return;
            const existing = container.querySelectorAll(`.${type}-person-row`).length;
            container.insertAdjacentHTML('beforeend', this.renderPersonRow(type, existing, {}));
        },

        removePersonRow(type, index) {
            const container = document.getElementById(`${type}-details-container`);
            if (!container) return;
            const row = document.getElementById(`${type}-row-${index}`);
            if (row) row.remove();
            container.querySelectorAll(`.${type}-person-row`).forEach((r, i) => {
                r.id = `${type}-row-${i}`;
                const badge = r.querySelector('.person-index');
                if (badge) badge.textContent = String(i + 1);
                r.querySelectorAll('input').forEach(inp => inp.setAttribute('data-index', i));
                const btn = r.querySelector('button');
                if (btn) btn.setAttribute('onclick', `Reports.removePersonRow('${type}', ${i})`);
            });
        },

        collectPersonDetails(type) {
            const container = document.getElementById(`${type}-details-container`);
            if (!container) return [];
            const results = [];
            container.querySelectorAll(`.${type}-person-row`).forEach(row => {
                const name = (row.querySelector('input[data-field="name"]')?.value || '').trim();
                const portfolio = (row.querySelector('input[data-field="portfolio"]')?.value || '').trim();
                if (name) results.push({ name, portfolio });
            });
            return results;
        },

        toggleDetailSection(type, countValue) {
            const section = document.getElementById(`${type}-details-section`);
            if (!section) return;
            if ((parseInt(countValue, 10) || 0) > 0) section.classList.remove('hidden');
            else section.classList.add('hidden');
        },

        // Final attendance numbers: typed count, but never lower than the number of names listed
        collectAttendance(fd) {
            const council = this.collectPersonDetails('council');
            const trainers = this.collectPersonDetails('trainer');
            const n = (k) => Math.max(0, parseInt(fd.get(k), 10) || 0);
            return {
                council_members_count: Math.max(n('council_members_count'), council.length),
                trainers_count: Math.max(n('trainers_count'), trainers.length),
                rotarians_count: n('rotarians_count'),
                interactors_count: n('interactors_count'),
                council_members_details: council.length > 0 ? JSON.stringify(council) : null,
                trainers_details: trainers.length > 0 ? JSON.stringify(trainers) : null,
                _council: council,
                _trainers: trainers
            };
        },

        // ==========================================
        // 3. GOOGLE MAPS URL PARSER (NEW)
        // ==========================================

        /**
         * Parses various Google Maps URL formats and plain coordinates.
         * Returns { latitude, longitude } or null.
         *
         * Supported inputs:
         *   https://www.google.com/maps/@11.0168,76.9558,15z
         *   https://www.google.com/maps/place/XYZ/@11.0168,76.9558,17z
         *   https://www.google.com/maps?q=11.0168,76.9558
         *   https://maps.google.com/?ll=11.0168,76.9558
         *   https://www.google.com/maps/place/.../data=!3m1!4b1!4m5!3m4!1s0x...!8m2!3d11.0168!4d76.9558
         *   11.0168, 76.9558     (plain coordinates)
         *   11.0168,76.9558
         */
        parseGoogleMapsUrl(input) {
            if (!input) return null;
            const str = String(input).trim();

            // Pattern 1: plain coordinates "lat, lng" or "lat,lng"
            const plainCoord = str.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
            if (plainCoord) {
                return { latitude: parseFloat(plainCoord[1]), longitude: parseFloat(plainCoord[2]) };
            }

            // Pattern 2: @lat,lng,zoom format
            const atCoord = str.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
            if (atCoord) {
                return { latitude: parseFloat(atCoord[1]), longitude: parseFloat(atCoord[2]) };
            }

            // Pattern 3: ?q= query parameter
            const qParam = str.match(/[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
            if (qParam) {
                return { latitude: parseFloat(qParam[1]), longitude: parseFloat(qParam[2]) };
            }

            // Pattern 4: ?ll= parameter
            const llParam = str.match(/[?&]ll=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
            if (llParam) {
                return { latitude: parseFloat(llParam[1]), longitude: parseFloat(llParam[2]) };
            }

            // Pattern 5: !3d{lat}!4d{lng} inside data= parameter
            const dataCoord = str.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
            if (dataCoord) {
                return { latitude: parseFloat(dataCoord[1]), longitude: parseFloat(dataCoord[2]) };
            }

            // Pattern 6: center=lat,lng
            const centerParam = str.match(/[?&]center=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
            if (centerParam) {
                return { latitude: parseFloat(centerParam[1]), longitude: parseFloat(centerParam[2]) };
            }

            return null;
        },

        /**
         * Reverse geocodes custom coordinates to street address.
         */
        async reverseGeocodeCustom(lat, lng) {
            try {
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await resp.json();
                return {
                    address: data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    city: data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || 'Coimbatore',
                    state: data?.address?.state || 'Tamil Nadu'
                };
            } catch (e) {
                return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, city: 'Coimbatore', state: 'Tamil Nadu' };
            }
        },

        /**
         * Forward geocodes a text query (e.g., "Codissia Trade Centre, Coimbatore")
         * to a lat/lng using Nominatim.
         */
        async forwardGeocode(query) {
            try {
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await resp.json();
                if (data && data.length > 0) {
                    const r = data[0];
                    return {
                        latitude: parseFloat(r.lat),
                        longitude: parseFloat(r.lon),
                        address: r.display_name
                    };
                }
            } catch (e) {
                console.warn('Forward geocode failed:', e);
            }
            return null;
        },

        // ==========================================
        // 4. GEO-TAG CONFIGURATION MODAL (NEW)
        // ==========================================
        openGeoTagConfigModal() {
            const now = this.customDateTime ? new Date(this.customDateTime) : new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

            window.AdminPanel.createModal({
                title: 'Configure Geo-Tag',
                size: 'medium',
                icon: 'map-location-dot',
                body: `
                    <div class="space-y-5">
                        <div class="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                            <p class="text-xs font-bold text-brand-blue mb-1.5">
                                <i class="fa-solid fa-circle-info mr-1"></i> How Geo-Tagging Works
                            </p>
                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                Choose between <strong>Live GPS</strong> (uses your device's current coordinates and current time)
                                or <strong>Custom Entry</strong> (specify date, time, and location manually — ideal for backdated reports or when photos are uploaded later).
                            </p>
                        </div>

                        <!-- Mode Toggle -->
                        <div class="grid grid-cols-2 gap-3">
                            <label class="relative cursor-pointer">
                                <input type="radio" name="geo_mode" value="live" class="peer sr-only" ${this.geoTagMode === 'live' ? 'checked' : ''} onchange="Reports.switchGeoMode('live')">
                                <div class="p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] peer-checked:border-brand-blue peer-checked:bg-brand-blue/5 transition-all">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-9 h-9 rounded-lg bg-brand-blue/15 flex items-center justify-center">
                                            <i class="fa-solid fa-satellite-dish text-brand-blue"></i>
                                        </div>
                                        <p class="text-sm font-bold">Live GPS</p>
                                    </div>
                                    <p class="text-[10px] text-slate-400">Current time + device location</p>
                                    <p class="text-[10px] mt-1 ${this.liveLocation ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}">
                                        <i class="fa-solid ${this.liveLocation ? 'fa-check-circle' : 'fa-xmark-circle'} mr-0.5"></i>
                                        ${this.liveLocation ? 'GPS Locked' : 'GPS Unavailable'}
                                    </p>
                                </div>
                            </label>

                            <label class="relative cursor-pointer">
                                <input type="radio" name="geo_mode" value="custom" class="peer sr-only" ${this.geoTagMode === 'custom' ? 'checked' : ''} onchange="Reports.switchGeoMode('custom')">
                                <div class="p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] peer-checked:border-yellow-500 peer-checked:bg-yellow-500/5 transition-all">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-9 h-9 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                                            <i class="fa-solid fa-pen-to-square text-yellow-600"></i>
                                        </div>
                                        <p class="text-sm font-bold">Custom Entry</p>
                                    </div>
                                    <p class="text-[10px] text-slate-400">Manual date, time & location</p>
                                    <p class="text-[10px] mt-1 ${this.customLocation ? 'text-green-500 font-bold' : 'text-slate-400'}">
                                        <i class="fa-solid ${this.customLocation ? 'fa-check-circle' : 'fa-circle-minus'} mr-0.5"></i>
                                        ${this.customLocation ? 'Custom Location Set' : 'Not Configured'}
                                    </p>
                                </div>
                            </label>
                        </div>

                        <!-- Custom Entry Panel -->
                        <div id="custom-geo-panel" class="${this.geoTagMode === 'custom' ? '' : 'hidden'} space-y-4 p-5 rounded-xl bg-yellow-500/5 border border-yellow-500/20">

                            <!-- Date & Time -->
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                                        <i class="fa-solid fa-calendar text-yellow-600 mr-1"></i> Custom Date
                                    </label>
                                    <input type="date" id="custom-date-input" class="admin-form-input w-full" value="${dateStr}">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                                        <i class="fa-solid fa-clock text-yellow-600 mr-1"></i> Custom Time
                                    </label>
                                    <input type="time" id="custom-time-input" class="admin-form-input w-full" value="${timeStr}">
                                </div>
                            </div>

                            <!-- Location Input -->
                            <div>
                                <label class="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                                    <i class="fa-brands fa-google text-yellow-600 mr-1"></i> Google Maps Location
                                </label>
                                <div class="flex gap-2">
                                    <input type="text" id="custom-location-input" class="admin-form-input flex-1" placeholder="Paste Google Maps URL, coordinates, or type a place..." value="${this.customLocation?.sourceInput || ''}">
                                    <button type="button" class="btn-primary btn-sm whitespace-nowrap" onclick="Reports.resolveCustomLocation()">
                                        <i class="fa-solid fa-magnifying-glass mr-1"></i> Resolve
                                    </button>
                                </div>
                                <div class="mt-2 flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed">
                                    <i class="fa-solid fa-lightbulb text-yellow-500 mt-0.5"></i>
                                    <div>
                                        <p><strong>Accepted formats:</strong></p>
                                        <ul class="mt-1 space-y-0.5 pl-3">
                                            <li>• <code class="bg-slate-100 dark:bg-slate-800 px-1 rounded">https://www.google.com/maps/@11.0168,76.9558,15z</code></li>
                                            <li>• <code class="bg-slate-100 dark:bg-slate-800 px-1 rounded">https://www.google.com/maps/place/...</code></li>
                                            <li>• <code class="bg-slate-100 dark:bg-slate-800 px-1 rounded">11.0168, 76.9558</code> (direct coordinates)</li>
                                            <li>• <code class="bg-slate-100 dark:bg-slate-800 px-1 rounded">Codissia Trade Centre, Coimbatore</code> (place name)</li>
                                        </ul>
                                        <p class="mt-1.5 text-yellow-600">
                                            <i class="fa-solid fa-triangle-exclamation mr-0.5"></i>
                                            Shortened links (<code>goo.gl/maps/...</code>, <code>maps.app.goo.gl/...</code>) must be expanded to the full URL first.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Resolved Preview -->
                            <div id="custom-location-preview" class="${this.customLocation ? '' : 'hidden'} p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p class="text-xs font-bold text-green-700 dark:text-green-400 mb-1">
                                    <i class="fa-solid fa-circle-check mr-1"></i> Location Resolved
                                </p>
                                <div class="text-[10px] text-slate-500 space-y-0.5">
                                    <p><strong>Coordinates:</strong> <span id="preview-coords">${this.customLocation ? `${this.customLocation.latitude.toFixed(6)}, ${this.customLocation.longitude.toFixed(6)}` : ''}</span></p>
                                    <p><strong>Address:</strong> <span id="preview-address">${this.customLocation?.address || ''}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="Reports.saveGeoTagConfig()">
                        <i class="fa-solid fa-check mr-1"></i> Apply Configuration
                    </button>
                `
            });
        },

        switchGeoMode(mode) {
            this.geoTagMode = mode;
            const panel = document.getElementById('custom-geo-panel');
            if (panel) {
                if (mode === 'custom') panel.classList.remove('hidden');
                else panel.classList.add('hidden');
            }
        },

        async resolveCustomLocation() {
            const inputEl = document.getElementById('custom-location-input');
            if (!inputEl) return;
            const input = inputEl.value.trim();
            if (!input) { toast.warning('Please enter a location, URL, or coordinates.'); return; }

            toast.info('Resolving location...');

            // Try parsing as URL/coordinates first
            let coords = this.parseGoogleMapsUrl(input);

            // If parsing failed, try as a text query (place name)
            if (!coords) {
                const forward = await this.forwardGeocode(input);
                if (forward) {
                    coords = { latitude: forward.latitude, longitude: forward.longitude };
                }
            }

            if (!coords) {
                toast.error('Could not resolve this location. Try a different format.');
                return;
            }

            const addrData = await this.reverseGeocodeCustom(coords.latitude, coords.longitude);

            this.customLocation = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                address: addrData.address,
                city: addrData.city,
                state: addrData.state,
                sourceInput: input
            };

            // Update preview
            const preview = document.getElementById('custom-location-preview');
            const previewCoords = document.getElementById('preview-coords');
            const previewAddress = document.getElementById('preview-address');
            if (preview) preview.classList.remove('hidden');
            if (previewCoords) previewCoords.textContent = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
            if (previewAddress) previewAddress.textContent = addrData.address;

            toast.success('Location resolved successfully');
        },

        saveGeoTagConfig() {
            if (this.geoTagMode === 'custom') {
                if (!this.customLocation) {
                    toast.error('Please resolve a custom location first.');
                    return;
                }
                const dateEl = document.getElementById('custom-date-input');
                const timeEl = document.getElementById('custom-time-input');
                if (dateEl && timeEl && dateEl.value && timeEl.value) {
                    this.customDateTime = `${dateEl.value}T${timeEl.value}:00`;
                }
            }
            this.applyActiveLocation();
            window.AdminPanel.closeModal();
            toast.success('Geo-tag configuration applied');
            // Re-render upload section
            this.refreshPhotoUploadUI();
        },

        refreshPhotoUploadUI() {
            // Re-render only the photo upload page (step 3) if visible
            const page3 = document.getElementById('report-page-3');
            if (page3) {
                page3.innerHTML = this.renderPhotoUploadSection();
                this.bindPhotoUploadHandlers();
                this.renderExistingPhotos();
            }
        },

        // ==========================================
        // 5. ADMIN DASHBOARD VIEW
        // ==========================================
        async render(workspace) {
            if (!workspace) return;
            const client = window.DB_ADMIN || window.supabaseClient;
            if (!client) {
                workspace.innerHTML = '<div class="p-8 text-center text-xs text-red-500">Database client unavailable.</div>';
                return;
            }

            workspace.innerHTML = '<div class="py-12 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading Reports Desk...</div>';

            try {
                const { data: events, error } = await client
                    .from('events')
                    .select('id, event_name, date, avenue_slug, is_dpp, status, report_submitted, report_submitted_at, avenue_id')
                    .order('date', { ascending: false })
                    .limit(50);

                if (error) throw error;

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Reports Center</span></div>
                                <h1 class="admin-page-title">Report Generation Center</h1>
                                <p class="admin-page-subtitle">Compile, review, watermark, and export official project reports with custom geo-tagging.</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <button class="btn-secondary btn-sm" onclick="Reports.openMonthlyReportModal()">
                                    <i class="fa-solid fa-calendar-days mr-1.5"></i> Monthly Report
                                </button>
                                <button class="btn-primary btn-sm" onclick="Reports.openEventSelector()">
                                    <i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i> Project Report
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                            <div class="admin-panel cursor-pointer hover-lift" onclick="Reports.openEventSelector('avenue')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
                                        <i class="fa-solid fa-rocket text-2xl text-[#E4345A]"></i>
                                    </div>
                                    <h4 class="text-sm font-black mb-1">Avenue Project Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Report with 6-8 geo-watermarked photos and statistics.</p>
                                    <button class="btn-primary btn-sm w-full" style="background:#E4345A;"><i class="fa-solid fa-file-pen mr-1.5"></i> Write Avenue Report</button>
                                </div>
                            </div>

                            <div class="admin-panel cursor-pointer hover-lift" onclick="Reports.openEventSelector('dpp')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                                        <i class="fa-solid fa-star text-2xl text-[#F59E0B]"></i>
                                    </div>
                                    <h4 class="text-sm font-black mb-1">DPP Project Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">District Priority Project report with Pillar & Category A/B/C.</p>
                                    <button class="btn-primary btn-sm w-full" style="background:#F59E0B;"><i class="fa-solid fa-star mr-1.5"></i> Write DPP Report</button>
                                </div>
                            </div>

                            <div class="admin-panel cursor-pointer hover-lift" onclick="Reports.openMonthlyReportModal()">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                                        <i class="fa-solid fa-calendar-days text-2xl text-[#17458F]"></i>
                                    </div>
                                    <h4 class="text-sm font-black mb-1">Monthly Consolidated Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Consolidated report across all club avenues for district submission.</p>
                                    <button class="btn-primary btn-sm w-full" style="background:#17458F;"><i class="fa-solid fa-file-word mr-1.5"></i> Export Monthly</button>
                                </div>
                            </div>
                        </div>

                        <div class="admin-panel">
                            <div class="admin-panel-header">
                                <h3 class="admin-panel-title"><i class="fa-solid fa-list-check text-brand-blue"></i> Project Report Registry</h3>
                            </div>
                            <div class="admin-panel-body p-0">
                                <div class="overflow-x-auto">
                                    <table class="admin-data-table">
                                        <thead>
                                            <tr>
                                                <th>Project Name</th>
                                                <th>Execution Date</th>
                                                <th>Avenue</th>
                                                <th>Classification</th>
                                                <th>Status</th>
                                                <th>Report Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(!events || events.length === 0)
                                                ? '<tr><td colspan="7" class="text-center py-10 text-slate-400">No events registered yet.</td></tr>'
                                                : events.map(e => `
                                                    <tr>
                                                        <td class="text-xs font-bold text-slate-800 dark:text-slate-100">${window.AdminPanel.esc(e.event_name)}</td>
                                                        <td class="text-xs text-slate-500">${window.AdminPanel.fmtDate(e.date)}</td>
                                                        <td class="text-xs capitalize">${(e.avenue_slug || '').replace(/_/g, ' ')}</td>
                                                        <td>${e.is_dpp ? '<span class="badge badge-yellow"><i class="fa-solid fa-star mr-1"></i>DPP</span>' : '<span class="badge badge-blue">Avenue</span>'}</td>
                                                        <td><span class="status-badge ${e.status}">${e.status}</span></td>
                                                        <td>${e.report_submitted ? '<span class="text-green-500 font-bold text-xs"><i class="fa-solid fa-check mr-1"></i>Submitted</span>' : '<span class="text-slate-400 text-xs">Draft/Pending</span>'}</td>
                                                        <td>
                                                            <div class="flex gap-1.5">
                                                                <button class="btn-primary btn-xs" onclick="Reports.openReportForm('${e.id}')" title="Open Report Editor">
                                                                    <i class="fa-solid fa-file-pen mr-1"></i> Report
                                                                </button>
                                                                ${e.report_submitted ? `
                                                                    <button class="btn-secondary btn-xs text-blue-600" onclick="Reports.emailReport('${e.id}')" title="Email report with photos">
                                                                        <i class="fa-solid fa-envelope"></i>
                                                                    </button>
                                                                    <button class="btn-secondary btn-xs text-[#E4345A]" onclick="Reports.generateDocument('${e.id}', 'docx')" title="Download Word">
                                                                        <i class="fa-solid fa-file-word"></i>
                                                                    </button>
                                                                    <button class="btn-secondary btn-xs text-red-600" onclick="Reports.generateDocument('${e.id}', 'pdf')" title="Download PDF">
                                                                        <i class="fa-solid fa-file-pdf"></i>
                                                                    </button>
                                                                ` : ''}
                                                            </div>
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
            } catch (err) {
                workspace.innerHTML = `<div class="p-8 text-center text-xs text-red-500">${err.message}</div>`;
            }
        },

        // ==========================================
        // 6. EVENT SELECTOR MODAL
        // ==========================================
        async openEventSelector(filterType = 'all') {
            const client = window.DB_ADMIN || window.supabaseClient;
            try {
                let query = client.from('events').select('id, event_name, date, avenue_slug, is_dpp').order('date', { ascending: false }).limit(50);
                if (filterType === 'dpp') query = query.eq('is_dpp', true);
                else if (filterType === 'avenue') query = query.eq('is_dpp', false);

                const { data: events } = await query;

                window.AdminPanel.createModal({
                    title: filterType === 'dpp' ? 'Select DPP Project' : 'Select Project for Report',
                    size: 'medium',
                    icon: filterType === 'dpp' ? 'star' : 'rocket',
                    body: `
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            ${(!events || events.length === 0) ? '<p class="text-center text-xs text-slate-400 py-8">No matching projects found.</p>' : events.map(e => `
                                <button class="w-full p-3.5 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left flex items-center justify-between" onclick="window.AdminPanel.closeModal(); Reports.openReportForm('${e.id}');">
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">${window.AdminPanel.esc(e.event_name)}</h4>
                                        <p class="text-[10px] text-slate-400 mt-0.5">${window.AdminPanel.fmtDate(e.date)} &bull; ${(e.avenue_slug || '').replace(/_/g, ' ')} ${e.is_dpp ? '&bull; DPP' : ''}</p>
                                    </div>
                                    <i class="fa-solid fa-arrow-right text-brand-blue text-xs"></i>
                                </button>
                            `).join('')}
                        </div>
                    `
                });
            } catch (e) {
                toast.error('Failed to load events: ' + e.message);
            }
        },

        // ==========================================
        // 7. REPORT WIZARD - OPEN FORM
        // ==========================================
        async openReportForm(eventId) {
            await this.init();
            const client = window.DB_ADMIN || window.supabaseClient;

            try {
                const { data: event, error } = await client
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single();

                if (error || !event) {
                    toast.error('Event record not found.');
                    return;
                }

                this.currentEvent = event;
                this.currentMode = event.is_dpp ? 'dpp' : 'avenue';
                this.reportPhotos = [];
                this.draftKey = `report_draft_${event.id}`;

                // Default custom date to event date
                if (event.date && !this.customDateTime) {
                    this.customDateTime = `${event.date}T${event.start_time || '10:00'}:00`;
                }

                const draft = this.loadDraft(event.id);
                if (draft && confirm(`A draft was found from ${new Date(draft.saved_at).toLocaleDateString('en-IN')}. Restore it?`)) {
                    this.reportPhotos = draft.photos || [];
                    this.reportWizardStep = draft.step || 1;
                }

                if (this.reportPhotos.length === 0) {
                    const { data: existingPhotos } = await client
                        .from('event_photos')
                        .select('*')
                        .eq('event_id', eventId)
                        .eq('is_report_photo', true)
                        .order('sort_order');

                    if (existingPhotos?.length) {
                        this.reportPhotos = existingPhotos.map(p => ({
                            id: p.id,
                            url: p.photo_url,
                            provider: p.storage_provider || 'cloudinary',
                            caption: p.caption || '',
                            existing: true
                        }));
                    }
                }

                if (this.currentMode === 'dpp') {
                    this.renderDPPReportForm(event);
                } else {
                    this.renderAvenueReportForm(event);
                }
            } catch (e) {
                toast.error('Failed to open form: ' + e.message);
            }
        },

        // ==========================================
        // 8. AVENUE REPORT WIZARD
        // ==========================================
        renderAvenueReportForm(event) {
            const avenueConfig = this.AVENUE_CONFIG[event.avenue_slug] || this.AVENUE_CONFIG.club_service;

            window.AdminPanel.createModal({
                title: 'Avenue Project Report',
                size: 'wide',
                icon: 'file-lines',
                body: `
                    <div class="p-5 rounded-2xl mb-6" style="background: linear-gradient(135deg, ${avenueConfig.color}15, ${avenueConfig.color}05); border: 1px solid ${avenueConfig.color}30;">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style="background: ${avenueConfig.color};">
                                <i class="fa-solid ${avenueConfig.icon} text-white text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-sm font-black text-slate-800 dark:text-slate-100">${window.AdminPanel.esc(event.event_name)}</h3>
                                <p class="text-[10px] text-slate-500 mt-0.5 font-semibold">${avenueConfig.label} &bull; ${window.AdminPanel.fmtDate(event.date)}</p>
                            </div>
                        </div>
                    </div>

                    ${this.renderWizardSteps([
                        { num: 1, label: 'Identification', icon: 'fa-circle-info' },
                        { num: 2, label: 'Content & Impact', icon: 'fa-pen-nib' },
                        { num: 3, label: 'Geo Photographs', icon: 'fa-camera' },
                        { num: 4, label: 'Finalize', icon: 'fa-paper-plane' }
                    ], avenueConfig.color)}

                    <form id="avenue-report-form" onsubmit="return false;" class="space-y-5">
                        ${this.renderAvenueStep1(event)}
                        ${this.renderAvenueStep2(event)}
                        ${this.renderAvenueStep3()}
                        ${this.renderAvenueStep4()}
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="Reports.cancelReport()">Cancel</button>
                    <button class="btn-secondary" id="report-prev-btn" onclick="Reports.wizardPrev(4)" style="display:none;">
                        <i class="fa-solid fa-chevron-left mr-1"></i> Back
                    </button>
                    <button class="btn-primary" id="report-next-btn" onclick="Reports.wizardNext(4)">
                        Continue <i class="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                    <button class="btn-primary" id="report-submit-btn" onclick="Reports.submitAvenueReport()" style="display:none; background: linear-gradient(135deg, #10b981, #059669);">
                        <i class="fa-solid fa-check-double mr-1.5"></i> Submit & Export
                    </button>
                `
            });

            this.reportWizardStep = 1;
            this.bindPhotoUploadHandlers();
            this.renderExistingPhotos();
        },

        renderAvenueStep1(event) {
            return `
                <div class="report-wizard-page" id="report-page-1">
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-circle-info"></i> Project Identification</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Project Title <span class="required">*</span></label>
                                    <input type="text" name="project_title" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_name)}" readonly style="opacity:0.85;">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Date <span class="required">*</span></label>
                                    <input type="text" class="admin-form-input" value="${window.AdminPanel.fmtDate(event.date)}" readonly style="opacity:0.85;">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Time</label>
                                    <input type="text" class="admin-form-input" value="${event.start_time || ''}${event.end_time ? ' - ' + event.end_time : ''}" readonly style="opacity:0.85;">
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Venue <span class="required">*</span></label>
                                    <input type="text" name="report_venue" required class="admin-form-input" value="${window.AdminPanel.esc(event.venue || '')}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-users-gear"></i> Project Leadership</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Project Chair(s) <span class="required">*</span></label>
                                    <input type="text" name="project_chairs" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_chair || '')}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Event Secretary</label>
                                    <input type="text" name="event_secretary" class="admin-form-input" value="${window.AdminPanel.esc(event.event_secretary || '')}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Proposed By <span class="required">*</span></label>
                                    <input type="text" name="proposed_by" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_proposed_by || '')}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Seconded By <span class="required">*</span></label>
                                    <input type="text" name="seconded_by" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_seconded_by || '')}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-handshake-angle"></i> Collaborations</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Collaborating Organisations</label>
                                <input type="text" name="collaborator_name" class="admin-form-input" value="${window.AdminPanel.esc(event.collaborator_name || '')}">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderAvenueStep2(event) {
            const parts = this.parseReportText(event.report_text);
            return `
                <div class="report-wizard-page hidden" id="report-page-2">
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-bullseye"></i> Objectives & Description</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Objectives <span class="required">*</span></label>
                                <textarea name="objectives" required rows="3" class="admin-form-input admin-form-textarea">${this.esc(parts.objectives || event.description || '')}</textarea>
                            </div>
                            <div class="admin-form-group mt-4">
                                <label class="admin-form-label">Description <span class="required">*</span></label>
                                <textarea name="description" required rows="7" class="admin-form-input admin-form-textarea">${this.esc(parts.description)}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-chart-bar"></i> Statistics</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Beneficiaries <span class="required">*</span></label>
                                    <input type="number" name="beneficiaries_count" required min="0" class="admin-form-input" value="${event.beneficiaries_count || 0}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Volunteers</label>
                                    <input type="number" name="volunteers_count" min="0" class="admin-form-input" value="${event.volunteers_count || 0}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Service Hours</label>
                                    <input type="number" name="service_hours" min="0" step="0.5" class="admin-form-input" value="${event.service_hours || 0}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Amount Spent (INR)</label>
                                    <input type="number" name="amount_spent" min="0" step="0.01" class="admin-form-input" value="${event.amount_spent || 0}">
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.renderAttendancePanel(event)}

                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-bullseye"></i> Impact & Outcomes</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Impact and Outcomes <span class="required">*</span></label>
                                <textarea name="impact_outcomes" required rows="4" class="admin-form-input admin-form-textarea">${this.esc(parts.impact)}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderAvenueStep3() {
            return `<div class="report-wizard-page hidden" id="report-page-3">${this.renderPhotoUploadSection()}</div>`;
        },

        renderAvenueStep4() {
            return `
                <div class="report-wizard-page hidden" id="report-page-4">
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-magnifying-glass-chart"></i> Review Summary</h3></div>
                        <div class="admin-panel-body" id="avenue-report-review"></div>
                    </div>
                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-paper-plane"></i> Finalize</h3></div>
                        <div class="admin-panel-body">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label class="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue cursor-pointer">
                                    <input type="radio" name="report_action" value="save_draft" checked class="accent-brand-blue w-4 h-4">
                                    <div><p class="text-xs font-bold">Save as Draft</p></div>
                                </label>
                                <label class="flex items-center gap-4 p-4 rounded-xl border-2 border-green-500/20 bg-green-500/[0.02] hover:border-green-500 cursor-pointer">
                                    <input type="radio" name="report_action" value="submit" class="accent-green-500 w-4 h-4">
                                    <div><p class="text-xs font-bold text-green-600">Submit & Export</p></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ==========================================
        // 9. DPP REPORT WIZARD
        // ==========================================
        renderDPPReportForm(event) {
            window.AdminPanel.createModal({
                title: 'District Priority Project Report',
                size: 'wide',
                icon: 'star',
                body: `
                    <div class="p-5 rounded-2xl mb-6" style="background: linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05)); border: 1px solid rgba(234,179,8,0.3);">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg">
                                <i class="fa-solid fa-star text-white text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-sm font-black text-yellow-700 dark:text-yellow-400">${window.AdminPanel.esc(event.event_name)}</h3>
                                <p class="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase">RI District 3206 Priority Project &bull; ${window.AdminPanel.fmtDate(event.date)}</p>
                            </div>
                        </div>
                    </div>

                    ${this.renderWizardSteps([
                        { num: 1, label: 'Identification', icon: 'fa-circle-info' },
                        { num: 2, label: 'DPP & Content', icon: 'fa-star' },
                        { num: 3, label: 'Geo Photographs', icon: 'fa-camera' },
                        { num: 4, label: 'Finalize', icon: 'fa-paper-plane' }
                    ], '#eab308')}

                    <form id="dpp-report-form" onsubmit="return false;" class="space-y-5">
                        ${this.renderDPPStep1(event)}
                        ${this.renderDPPStep2(event)}
                        ${this.renderDPPStep3()}
                        ${this.renderDPPStep4()}
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="Reports.cancelReport()">Cancel</button>
                    <button class="btn-secondary" id="report-prev-btn" onclick="Reports.wizardPrev(4)" style="display:none;">
                        <i class="fa-solid fa-chevron-left mr-1"></i> Back
                    </button>
                    <button class="btn-primary" id="report-next-btn" onclick="Reports.wizardNext(4)">
                        Continue <i class="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                    <button class="btn-primary" id="report-submit-btn" onclick="Reports.submitDPPReport()" style="display:none; background: linear-gradient(135deg, #f59e0b, #d97706);">
                        <i class="fa-solid fa-star mr-1.5"></i> Submit DPP Report
                    </button>
                `
            });

            this.reportWizardStep = 1;
            this.bindPhotoUploadHandlers();
            this.renderExistingPhotos();
        },

        renderDPPStep1(event) {
            return `
                <div class="report-wizard-page" id="report-page-1">
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-circle-info"></i> Project Identification</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Project Title <span class="required">*</span></label>
                                    <input type="text" name="project_title" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_name)}" readonly>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Date <span class="required">*</span></label>
                                    <input type="text" class="admin-form-input" value="${window.AdminPanel.fmtDate(event.date)}" readonly>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Time</label>
                                    <input type="text" class="admin-form-input" value="${event.start_time || ''}" readonly>
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Venue <span class="required">*</span></label>
                                    <input type="text" name="report_venue" required class="admin-form-input" value="${window.AdminPanel.esc(event.venue || '')}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-users-gear"></i> Leadership</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Project Chair(s) <span class="required">*</span></label>
                                    <input type="text" name="project_chairs" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_chair || '')}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Event Secretary</label>
                                    <input type="text" name="event_secretary" class="admin-form-input" value="${window.AdminPanel.esc(event.event_secretary || '')}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Proposed By <span class="required">*</span></label>
                                    <input type="text" name="proposed_by" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_proposed_by || '')}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Seconded By <span class="required">*</span></label>
                                    <input type="text" name="seconded_by" required class="admin-form-input" value="${window.AdminPanel.esc(event.event_seconded_by || '')}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-handshake-angle"></i> Collaboration</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Collaborating Organisations</label>
                                <input type="text" name="collaborator_name" class="admin-form-input" value="${window.AdminPanel.esc(event.collaborator_name || '')}">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderDPPStep2(event) {
            const parts = this.parseReportText(event.report_text);
            const catVal = this.normalizeDppCategory(event.dpp_category);
            const pillarKnown = this.DPP_PILLARS.includes(event.dpp_pillar);
            return `
                <div class="report-wizard-page hidden" id="report-page-2">
                    <div class="admin-panel mb-5" style="border-top: 3px solid #eab308 !important;">
                        <div class="admin-panel-header"><h3 class="admin-panel-title text-yellow-600"><i class="fa-solid fa-star"></i> DPP Pillar & Category</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label text-yellow-600">DPP Pillar <span class="required">*</span></label>
                                    <select name="dpp_pillar" required class="admin-form-input admin-form-select">
                                        <option value="">Select Pillar</option>
                                        ${this.DPP_PILLARS.map(p => `<option value="${this.esc(p)}" ${event.dpp_pillar === p ? 'selected' : ''}>${this.esc(p)}</option>`).join('')}
                                        ${event.dpp_pillar && !pillarKnown ? `<option value="${this.esc(event.dpp_pillar)}" selected>${this.esc(event.dpp_pillar)}</option>` : ''}
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label text-yellow-600">DPP Category <span class="required">*</span></label>
                                    <select name="dpp_category" required class="admin-form-input admin-form-select" onchange="Reports.toggleCategoryC(this.value)">
                                        <option value="">Select Category</option>
                                        ${this.DPP_CATEGORIES.map(c => `<option value="${c.value}" ${catVal === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label text-yellow-600">Reason for Pillar Alignment <span class="required">*</span></label>
                                    <textarea name="pillar_alignment_reason" required rows="3" class="admin-form-input admin-form-textarea">${this.esc(event.pillar_alignment_reason || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-bullseye"></i> Content</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Objectives <span class="required">*</span></label>
                                <textarea name="objectives" required rows="3" class="admin-form-input admin-form-textarea">${this.esc(parts.objectives || event.description || '')}</textarea>
                            </div>
                            <div class="admin-form-group mt-4">
                                <label class="admin-form-label">Description <span class="required">*</span></label>
                                <textarea name="description" required rows="7" class="admin-form-input admin-form-textarea">${this.esc(parts.description)}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-chart-bar"></i> Statistics</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-grid">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Beneficiaries <span class="required">*</span></label>
                                    <input type="number" name="beneficiaries_count" required min="0" class="admin-form-input" value="${event.beneficiaries_count || 0}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Volunteers</label>
                                    <input type="number" name="volunteers_count" min="0" class="admin-form-input" value="${event.volunteers_count || 0}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Service Hours</label>
                                    <input type="number" name="service_hours" min="0" step="0.5" class="admin-form-input" value="${event.service_hours || 0}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Amount Spent</label>
                                    <input type="number" name="amount_spent" min="0" step="0.01" class="admin-form-input" value="${event.amount_spent || 0}">
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.renderAttendancePanel(event)}

                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-bullseye"></i> Impact</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Impact and Outcomes <span class="required">*</span></label>
                                <textarea name="impact_outcomes" required rows="4" class="admin-form-input admin-form-textarea">${this.esc(parts.impact)}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="admin-panel ${catVal === 'C' ? '' : 'hidden'}" id="category-c-section" style="border-left: 4px solid #eab308 !important;">
                        <div class="admin-panel-header"><h3 class="admin-panel-title text-yellow-600"><i class="fa-solid fa-arrows-spin"></i> Sustainability (Category C)</h3></div>
                        <div class="admin-panel-body">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Sustainability or Follow-up</label>
                                <textarea name="sustainability" rows="3" class="admin-form-input admin-form-textarea">${this.esc(parts.sustainability || event.dpp_sustainability_plan || '')}</textarea>
                            </div>
                            <div class="admin-form-grid mt-4">
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Follow-up Date</label>
                                    <input type="date" name="followup_date" class="admin-form-input">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Follow-up Time</label>
                                    <input type="time" name="followup_time" class="admin-form-input">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderDPPStep3() {
            return `<div class="report-wizard-page hidden" id="report-page-3">${this.renderPhotoUploadSection()}</div>`;
        },

        renderDPPStep4() {
            return `
                <div class="report-wizard-page hidden" id="report-page-4">
                    <div class="admin-panel mb-5">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-check-double"></i> DPP Report Review</h3></div>
                        <div class="admin-panel-body" id="dpp-report-review"></div>
                    </div>
                    <div class="admin-panel">
                        <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-paper-plane"></i> Finalize</h3></div>
                        <div class="admin-panel-body">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label class="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue cursor-pointer">
                                    <input type="radio" name="report_action" value="save_draft" checked class="accent-brand-blue w-4 h-4">
                                    <div><p class="text-xs font-bold">Save as Draft</p></div>
                                </label>
                                <label class="flex items-center gap-4 p-4 rounded-xl border-2 border-yellow-500/20 bg-yellow-500/[0.02] hover:border-yellow-500 cursor-pointer">
                                    <input type="radio" name="report_action" value="submit" class="accent-yellow-500 w-4 h-4">
                                    <div><p class="text-xs font-bold text-yellow-600">Submit & Export</p></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        toggleCategoryC(category) {
            const sec = document.getElementById('category-c-section');
            if (sec) {
                if (category === 'C') sec.classList.remove('hidden');
                else sec.classList.add('hidden');
            }
        },

        renderWizardSteps(steps, color) {
            return `
                <div class="flex items-center justify-between mb-8 overflow-x-auto pb-2" id="report-wizard-steps">
                    ${steps.map((s, i, arr) => `
                        <div class="wizard-step flex items-center ${i < arr.length - 1 ? 'flex-1' : ''}" data-step="${s.num}">
                            <div class="flex flex-col items-center gap-1.5">
                                <div class="wizard-circle w-10 h-10 rounded-full flex items-center justify-center transition-all font-bold text-sm ${s.num === 1 ? 'text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}" ${s.num === 1 ? `style="background:${color};"` : ''}>
                                    <i class="fa-solid ${s.icon} text-xs"></i>
                                </div>
                                <span class="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">${s.label}</span>
                            </div>
                            ${i < arr.length - 1 ? '<div class="wizard-line flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 mx-2 mt-5"></div>' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        },

        // ==========================================
        // 10. PHOTO UPLOAD WITH GEO-TAG CONFIG
        // ==========================================
        renderPhotoUploadSection() {
            const hasLocation = !!this.activeLocation;
            const modeLabel = this.geoTagMode === 'custom' ? 'Custom Entry' : 'Live GPS';
            const modeIcon = this.geoTagMode === 'custom' ? 'fa-pen-to-square' : 'fa-satellite-dish';
            const modeColor = this.geoTagMode === 'custom' ? 'text-yellow-600' : 'text-brand-blue';
            const modeBg = this.geoTagMode === 'custom' ? 'bg-yellow-500/10' : 'bg-brand-blue/10';

            return `
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-camera"></i> Geo-Tagged Photographs</h3>
                        <span class="badge badge-blue" id="photo-count-badge">${this.reportPhotos.length}/${this.maxPhotos}</span>
                    </div>
                    <div class="admin-panel-body space-y-4">

                        <!-- Info Banner -->
                        <div class="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                            <p class="text-xs font-bold text-brand-blue mb-1.5">
                                <i class="fa-solid fa-circle-info mr-1"></i> Photographic Requirements
                            </p>
                            <ul class="text-[11px] text-slate-500 space-y-1">
                                <li>• Minimum <strong>${this.minPhotos}</strong> and maximum <strong>${this.maxPhotos}</strong> action photos</li>
                                <li>• Watermarked with date, time, coordinates, and map overlay</li>
                                <li>• Supports Live GPS or Custom Manual Entry</li>
                            </ul>
                        </div>

                        <!-- GEO-TAG CONFIGURATION PANEL -->
                        <div class="rounded-xl border-2 overflow-hidden" style="border-color: ${hasLocation ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; background: ${hasLocation ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)'};">
                            <div class="p-4 border-b border-slate-200/40 dark:border-white/5">
                                <div class="flex items-center justify-between gap-3 flex-wrap">
                                    <div class="flex items-center gap-3 flex-1 min-w-0">
                                        <div class="w-10 h-10 rounded-xl ${modeBg} flex items-center justify-center flex-shrink-0">
                                            <i class="fa-solid ${modeIcon} ${modeColor} text-lg"></i>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-xs font-bold flex items-center gap-2">
                                                <span>Active Mode: <span class="${modeColor}">${modeLabel}</span></span>
                                                ${hasLocation
                                                    ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 font-black"><i class="fa-solid fa-check mr-0.5"></i>READY</span>'
                                                    : '<span class="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 font-black"><i class="fa-solid fa-xmark mr-0.5"></i>NOT CONFIGURED</span>'
                                                }
                                            </p>
                                            <p class="text-[10px] text-slate-400 mt-0.5 truncate">
                                                ${hasLocation
                                                    ? `${this.activeLocation.latitude.toFixed(6)}° N, ${this.activeLocation.longitude.toFixed(6)}° E`
                                                    : 'Click "Configure" to set up geo-tag'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" class="btn-primary btn-sm whitespace-nowrap" onclick="Reports.openGeoTagConfigModal()">
                                        <i class="fa-solid fa-sliders mr-1.5"></i> Configure
                                    </button>
                                </div>
                            </div>
                            ${hasLocation ? `
                                <div class="p-3 bg-white/40 dark:bg-slate-900/30 text-[10px] space-y-1">
                                    <div class="flex items-start gap-2">
                                        <i class="fa-solid fa-location-dot text-green-500 mt-0.5"></i>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-slate-500"><strong class="text-slate-700 dark:text-slate-300">Address:</strong> ${window.AdminPanel.esc(this.activeLocationName.substring(0, 100))}${this.activeLocationName.length > 100 ? '...' : ''}</p>
                                        </div>
                                    </div>
                                    ${this.geoTagMode === 'custom' && this.customDateTime ? `
                                        <div class="flex items-start gap-2">
                                            <i class="fa-solid fa-calendar text-yellow-600 mt-0.5"></i>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-slate-500"><strong class="text-slate-700 dark:text-slate-300">Custom DateTime:</strong> ${new Date(this.customDateTime).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>

                        <!-- Upload Zone -->
                        <div class="admin-upload-zone relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-brand-blue transition cursor-pointer ${!hasLocation ? 'opacity-50 pointer-events-none' : ''}" id="report-photo-upload-zone">
                            <input type="file" id="report-photo-input" accept="image/*" multiple class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" ${!hasLocation ? 'disabled' : ''}>
                            <i class="fa-solid fa-cloud-arrow-up text-4xl text-brand-blue mb-3"></i>
                            <p class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">${hasLocation ? 'Drop photos here or click to upload' : 'Configure geo-tag first'}</p>
                            <p class="text-[10px] text-slate-400">${this.reportPhotos.length}/${this.maxPhotos} uploaded</p>
                        </div>

                        <!-- Progress Bar -->
                        <div class="flex items-center gap-2 text-xs">
                            <div class="flex-1 h-2 rounded-full bg-slate-200/50 dark:bg-slate-700/50 overflow-hidden">
                                <div class="h-full rounded-full transition-all ${this.reportPhotos.length >= this.minPhotos ? 'bg-green-500' : 'bg-yellow-500'}" style="width:${(this.reportPhotos.length / this.maxPhotos) * 100}%"></div>
                            </div>
                            <span class="text-[10px] font-bold ${this.reportPhotos.length >= this.minPhotos ? 'text-green-500' : 'text-yellow-500'}">
                                ${this.reportPhotos.length >= this.minPhotos ? 'Minimum met' : `${this.minPhotos - this.reportPhotos.length} more needed`}
                            </span>
                        </div>

                        <div id="photo-processing" class="hidden p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-center gap-3">
                            <i class="fa-solid fa-spinner fa-spin text-brand-blue"></i>
                            <p class="text-xs text-brand-blue font-bold">Applying geo-tag watermark...</p>
                        </div>

                        <div id="report-photos-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
                    </div>
                </div>
            `;
        },

        bindPhotoUploadHandlers() {
            setTimeout(() => {
                const input = document.getElementById('report-photo-input');
                const zone = document.getElementById('report-photo-upload-zone');
                if (!input || !zone) return;

                zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('bg-brand-blue/10'); });
                zone.addEventListener('dragleave', () => zone.classList.remove('bg-brand-blue/10'));
                zone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    zone.classList.remove('bg-brand-blue/10');
                    if (e.dataTransfer.files) this.processPhotoFiles(e.dataTransfer.files);
                });
                input.addEventListener('change', (e) => {
                    if (e.target.files) this.processPhotoFiles(e.target.files);
                });
            }, 100);
        },

        async processPhotoFiles(files) {
            this.applyActiveLocation();
            if (!this.activeLocation) {
                toast.error('Configure geo-tag before uploading photos.');
                return;
            }

            const remaining = this.maxPhotos - this.reportPhotos.length;
            if (remaining <= 0) {
                toast.warning(`Maximum ${this.maxPhotos} photos allowed.`);
                return;
            }

            const filesToProcess = Array.from(files).slice(0, remaining);
            const procEl = document.getElementById('photo-processing');
            if (procEl) procEl.classList.remove('hidden');

            for (const file of filesToProcess) {
                if (!file.type.startsWith('image/')) continue;
                try {
                    const watermarkedBlob = await this.applyGeoWatermark(file);
                    const watermarkedFile = new File([watermarkedBlob], file.name, { type: 'image/jpeg' });

                    const result = await window.Uploader.upload(watermarkedFile, {
                        type: 'report_photo',
                        folder: 'reports/' + this.currentEvent.id
                    });

                    this.reportPhotos.push({
                        url: result.url,
                        provider: result.provider,
                        caption: '',
                        existing: false
                    });
                } catch (err) {
                    console.error(err);
                }
            }

            if (procEl) procEl.classList.add('hidden');
            this.renderExistingPhotos();
            this.updatePhotoCounter();
        },

        async applyGeoWatermark(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const reader = new FileReader();

                reader.onload = (e) => {
                    img.onload = async () => {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            const MAX_WIDTH = 1920;
                            let width = img.width;
                            let height = img.height;
                            if (width > MAX_WIDTH) {
                                height = (MAX_WIDTH / width) * height;
                                width = MAX_WIDTH;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);

                            let mapImg = null;
                            try { mapImg = await this.loadStaticMap(); } catch (e) {}

                            this.drawWatermarkOverlay(ctx, width, height, mapImg);

                            canvas.toBlob((blob) => {
                                if (blob) resolve(blob);
                                else reject(new Error('Canvas export failed'));
                            }, 'image/jpeg', 0.92);
                        } catch (err) { reject(err); }
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        // ==========================================
        // 11. PREMIUM VECTOR ICONS (NO EMOJIS)
        // ==========================================
        drawCalendarIcon(ctx, x, y, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const w = size * 0.85, h = size * 0.78;
            const ox = x - w / 2, oy = y - h / 2 + size * 0.08;
            const r = 2;

            ctx.beginPath();
            ctx.moveTo(ox + r, oy);
            ctx.lineTo(ox + w - r, oy);
            ctx.quadraticCurveTo(ox + w, oy, ox + w, oy + r);
            ctx.lineTo(ox + w, oy + h - r);
            ctx.quadraticCurveTo(ox + w, oy + h, ox + w - r, oy + h);
            ctx.lineTo(ox + r, oy + h);
            ctx.quadraticCurveTo(ox, oy + h, ox, oy + h - r);
            ctx.lineTo(ox, oy + r);
            ctx.quadraticCurveTo(ox, oy, ox + r, oy);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(ox + r, oy);
            ctx.lineTo(ox + w - r, oy);
            ctx.quadraticCurveTo(ox + w, oy, ox + w, oy + r);
            ctx.lineTo(ox + w, oy + h * 0.28);
            ctx.lineTo(ox, oy + h * 0.28);
            ctx.lineTo(ox, oy + r);
            ctx.quadraticCurveTo(ox, oy, ox + r, oy);
            ctx.closePath();
            ctx.fill();

            const ringY = oy - size * 0.08;
            ctx.beginPath();
            ctx.moveTo(ox + w * 0.22, ringY);
            ctx.lineTo(ox + w * 0.22, oy + size * 0.1);
            ctx.moveTo(ox + w * 0.78, ringY);
            ctx.lineTo(ox + w * 0.78, oy + size * 0.1);
            ctx.lineWidth = 2.2;
            ctx.stroke();

            ctx.fillStyle = color;
            const dotR = 1.1;
            const gridX = ox + w * 0.22;
            const gridY = oy + h * 0.5;
            const spacing = w * 0.18;
            for (let col = 0; col < 3; col++) {
                for (let row = 0; row < 2; row++) {
                    ctx.beginPath();
                    ctx.arc(gridX + col * spacing, gridY + row * spacing * 0.9, dotR, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        },

        drawClockIcon(ctx, x, y, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const radius = size * 0.42;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 1.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + radius * 0.45, y - radius * 0.25);
            ctx.lineWidth = 2.2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - radius * 0.72);
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.lineWidth = 1.5;
            [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(angle => {
                const inner = radius * 0.82;
                const outer = radius * 0.95;
                const x1 = x + Math.cos(angle - Math.PI / 2) * inner;
                const y1 = y + Math.sin(angle - Math.PI / 2) * inner;
                const x2 = x + Math.cos(angle - Math.PI / 2) * outer;
                const y2 = y + Math.sin(angle - Math.PI / 2) * outer;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
            ctx.restore();
        },

        drawMapPinIcon(ctx, x, y, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 1.8;

            const w = size * 0.6;
            const h = size * 0.85;
            const tipY = y + h / 2;
            const centerY = y - h * 0.1;

            ctx.beginPath();
            ctx.moveTo(x, tipY);
            ctx.bezierCurveTo(x - w * 0.7, tipY - h * 0.4, x - w * 0.7, centerY - h * 0.4, x, centerY - h * 0.4);
            ctx.bezierCurveTo(x + w * 0.7, centerY - h * 0.4, x + w * 0.7, tipY - h * 0.4, x, tipY);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, centerY - h * 0.15, w * 0.22, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.restore();
        },

        drawBuildingIcon(ctx, x, y, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 1.5;

            const w = size * 0.75, h = size * 0.85;
            const ox = x - w / 2, oy = y - h / 2;

            ctx.beginPath();
            ctx.rect(ox, oy + h * 0.12, w, h * 0.88);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(ox - w * 0.08, oy + h * 0.12);
            ctx.lineTo(x, oy);
            ctx.lineTo(ox + w + w * 0.08, oy + h * 0.12);
            ctx.closePath();
            ctx.fill();

            const winSize = w * 0.16;
            const winGapX = w * 0.22;
            const winY1 = oy + h * 0.32;
            const winY2 = oy + h * 0.62;
            [0, 1].forEach(col => {
                [winY1, winY2].forEach(yPos => {
                    ctx.fillRect(ox + w * 0.22 + col * winGapX, yPos, winSize, winSize);
                });
            });
            ctx.restore();
        },

        // ==========================================
        // 12. WATERMARK OVERLAY (Uses customDateTime)
        // ==========================================
        drawWatermarkOverlay(ctx, width, height, mapImg) {
            const panelHeight = Math.min(240, height * 0.27);
            const panelY = height - panelHeight;
            const padding = 24;
            const mapSize = panelHeight - padding * 2;

            // Dark gradient backdrop
            const gradient = ctx.createLinearGradient(0, panelY, 0, height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
            gradient.addColorStop(0.3, 'rgba(10, 15, 25, 0.88)');
            gradient.addColorStop(1, 'rgba(5, 10, 20, 0.97)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, panelY, width, panelHeight);

            // Top brand lines
            ctx.fillStyle = '#E4345A';
            ctx.fillRect(0, panelY, width, 3);
            ctx.fillStyle = '#F7A81B';
            ctx.fillRect(0, panelY + 3, width, 1);

            // Map
            if (mapImg) {
                const mapX = padding;
                const mapY = panelY + padding;

                ctx.strokeStyle = 'rgba(228, 52, 90, 0.6)';
                ctx.lineWidth = 2;
                ctx.strokeRect(mapX - 3, mapY - 3, mapSize + 6, mapSize + 6);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(mapX - 1, mapY - 1, mapSize + 2, mapSize + 2);

                ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);

                const pinX = mapX + mapSize / 2;
                const pinY = mapY + mapSize / 2;

                ctx.beginPath();
                ctx.arc(pinX, pinY, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(228, 52, 90, 0.3)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(pinX, pinY, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#E4345A';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(pinX - 16, pinY); ctx.lineTo(pinX - 9, pinY);
                ctx.moveTo(pinX + 9, pinY); ctx.lineTo(pinX + 16, pinY);
                ctx.moveTo(pinX, pinY - 16); ctx.lineTo(pinX, pinY - 9);
                ctx.moveTo(pinX, pinY + 9); ctx.lineTo(pinX, pinY + 16);
                ctx.stroke();

                ctx.strokeStyle = '#F7A81B';
                ctx.lineWidth = 1.8;
                const bracket = 8;
                const corners = [
                    [mapX, mapY], [mapX + mapSize, mapY],
                    [mapX, mapY + mapSize], [mapX + mapSize, mapY + mapSize]
                ];
                corners.forEach(([cx, cy], i) => {
                    ctx.beginPath();
                    const dx = i % 2 === 0 ? 1 : -1;
                    const dy = i < 2 ? 1 : -1;
                    ctx.moveTo(cx + dx * bracket, cy);
                    ctx.lineTo(cx, cy);
                    ctx.lineTo(cx, cy + dy * bracket);
                    ctx.stroke();
                });
            }

            const textStartX = mapImg ? padding * 2 + mapSize + 10 : padding;
            const iconSize = 18;
            const iconColOffset = 14;
            const textOffset = textStartX + iconColOffset * 2 + 6;
            const topY = panelY + padding + 10;
            const lineHeight = 32;

            // Use CUSTOM DATETIME if set, otherwise live
            const timestampSource = (this.geoTagMode === 'custom' && this.customDateTime) ? new Date(this.customDateTime) : new Date();

            const dateStr = timestampSource.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = timestampSource.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const lat = this.activeLocation.latitude.toFixed(6);
            const lng = this.activeLocation.longitude.toFixed(6);
            const address = this.activeLocationName || `${this.activeLocation.city || 'Coimbatore'}, Tamil Nadu`;

            // ROW 1: Calendar + Date
            this.drawCalendarIcon(ctx, textStartX + iconColOffset, topY + 6, iconSize, '#FFFFFF');
            ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textBaseline = 'middle';
            ctx.fillText(dateStr, textOffset, topY + 8);

            // ROW 2: Clock + Time
            this.drawClockIcon(ctx, textStartX + iconColOffset, topY + lineHeight + 6, iconSize, '#F7A81B');
            ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#F7A81B';
            ctx.fillText(timeStr, textOffset, topY + lineHeight + 8);

            // ROW 3: Map Pin + Coordinates
            this.drawMapPinIcon(ctx, textStartX + iconColOffset, topY + lineHeight * 2 + 6, iconSize, '#4ADE80');
            ctx.font = 'bold 14px "Consolas", "Courier New", monospace';
            ctx.fillStyle = '#4ADE80';
            ctx.fillText(`${lat}° N, ${lng}° E`, textOffset, topY + lineHeight * 2 + 8);

            // ROW 4: Building + Address
            this.drawBuildingIcon(ctx, textStartX + iconColOffset, topY + lineHeight * 3 + 6, iconSize, '#CBD5E1');
            ctx.font = '13px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#E2E8F0';
            const maxAddressLen = Math.floor((width - textOffset - padding) / 7);
            const displayAddress = address.length > maxAddressLen ? address.substring(0, maxAddressLen - 3) + '...' : address;
            ctx.fillText(displayAddress, textOffset, topY + lineHeight * 3 + 8);

            // Verified badge bottom-right
            const badgeW = 110;
            const badgeH = 20;
            const badgeX = width - badgeW - 12;
            const badgeY = height - badgeH - 10;

            ctx.fillStyle = 'rgba(228, 52, 90, 0.9)';
            ctx.beginPath();
            ctx.moveTo(badgeX + 4, badgeY);
            ctx.lineTo(badgeX + badgeW - 4, badgeY);
            ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + 4);
            ctx.lineTo(badgeX + badgeW, badgeY + badgeH - 4);
            ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - 4, badgeY + badgeH);
            ctx.lineTo(badgeX + 4, badgeY + badgeH);
            ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - 4);
            ctx.lineTo(badgeX, badgeY + 4);
            ctx.quadraticCurveTo(badgeX, badgeY, badgeX + 4, badgeY);
            ctx.closePath();
            ctx.fill();

            ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText('VERIFIED GEO-STAMPED', badgeX + badgeW / 2, badgeY + badgeH / 2);
            ctx.textAlign = 'start';
        },

        async loadStaticMap() {
            return new Promise((resolve, reject) => {
                if (!this.activeLocation) { reject('No active location'); return; }
                const lat = this.activeLocation.latitude;
                const lng = this.activeLocation.longitude;
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=300x300&markers=${lat},${lng},red-pushpin`;
                img.onload = () => resolve(img);
                img.onerror = () => reject('Map provider offline');
                setTimeout(() => reject('Timeout'), 4000);
            });
        },

        renderExistingPhotos() {
            const grid = document.getElementById('report-photos-grid');
            if (!grid) return;
            if (this.reportPhotos.length === 0) {
                grid.innerHTML = '<p class="col-span-full text-xs text-slate-400 text-center py-6">No photographs uploaded yet.</p>';
                return;
            }
            grid.innerHTML = this.reportPhotos.map((p, i) => `
                <div class="relative group rounded-xl overflow-hidden border border-slate-200/60 dark:border-white/5 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    <img src="${p.url}" class="w-full h-28 object-cover" alt="Photo ${i+1}">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2">
                        <input type="text" class="w-full px-2 py-1 text-[9px] bg-white/20 backdrop-blur border border-white/20 rounded text-white placeholder-white/50" placeholder="Caption..." value="${window.AdminPanel.esc(p.caption)}" onchange="Reports.updatePhotoCaption(${i}, this.value)">
                    </div>
                    <div class="absolute top-2 right-2 w-5 h-5 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-[9px] text-white font-bold">${i + 1}</div>
                    <button class="absolute bottom-2 right-2 w-6 h-6 bg-red-500/90 backdrop-blur rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition z-20" onclick="Reports.removePhoto(${i})">
                        <i class="fa-solid fa-trash text-[9px]"></i>
                    </button>
                </div>
            `).join('');
        },

        updatePhotoCaption(i, caption) { if (this.reportPhotos[i]) this.reportPhotos[i].caption = caption; },
        removePhoto(i) { this.reportPhotos.splice(i, 1); this.renderExistingPhotos(); this.updatePhotoCounter(); },
        updatePhotoCounter() {
            const badge = document.getElementById('photo-count-badge');
            if (badge) badge.textContent = `${this.reportPhotos.length}/${this.maxPhotos}`;
        },

        // ==========================================
        // 13. WIZARD CONTROLLER
        // ==========================================
        wizardNext(totalSteps) {
            const page = document.getElementById(`report-page-${this.reportWizardStep}`);
            if (!page) return;

            const inputs = page.querySelectorAll('[required]');
            let valid = true;
            inputs.forEach(input => {
                if (!input.value?.trim()) {
                    input.classList.add('border-red-500');
                    valid = false;
                } else {
                    input.classList.remove('border-red-500');
                }
            });

            if (!valid) { toast.warning('Please complete all mandatory fields.'); return; }

            if (this.reportWizardStep === 3 && this.reportPhotos.length < this.minPhotos) {
                toast.warning(`Minimum ${this.minPhotos} watermarked photos required.`);
                return;
            }

            if (this.reportWizardStep >= totalSteps) return;

            page.classList.add('hidden');
            this.reportWizardStep++;
            document.getElementById(`report-page-${this.reportWizardStep}`)?.classList.remove('hidden');
            this.updateWizardUI(totalSteps);

            if (this.reportWizardStep === totalSteps) this.generateReview();
            this.autoSaveDraft();
        },

        wizardPrev(totalSteps) {
            if (this.reportWizardStep <= 1) return;
            document.getElementById(`report-page-${this.reportWizardStep}`)?.classList.add('hidden');
            this.reportWizardStep--;
            document.getElementById(`report-page-${this.reportWizardStep}`)?.classList.remove('hidden');
            this.updateWizardUI(totalSteps);
        },

        updateWizardUI(totalSteps) {
            const color = this.currentMode === 'dpp' ? '#F59E0B' : '#E4345A';
            document.querySelectorAll('.wizard-step').forEach(step => {
                const n = parseInt(step.getAttribute('data-step'), 10);
                const circle = step.querySelector('.wizard-circle');
                if (!circle) return;

                if (n < this.reportWizardStep) {
                    circle.style.background = '#10B981';
                    circle.className = 'wizard-circle w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg';
                } else if (n === this.reportWizardStep) {
                    circle.style.background = color;
                    circle.className = 'wizard-circle w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg';
                } else {
                    circle.style.background = '';
                    circle.className = 'wizard-circle w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-200 dark:bg-slate-700 text-slate-400';
                }
            });

            const prevBtn = document.getElementById('report-prev-btn');
            const nextBtn = document.getElementById('report-next-btn');
            const submitBtn = document.getElementById('report-submit-btn');
            if (prevBtn) prevBtn.style.display = this.reportWizardStep > 1 ? '' : 'none';
            if (this.reportWizardStep >= totalSteps) {
                if (nextBtn) nextBtn.style.display = 'none';
                if (submitBtn) submitBtn.style.display = '';
            } else {
                if (nextBtn) nextBtn.style.display = '';
                if (submitBtn) submitBtn.style.display = 'none';
            }
        },

        generateReview() {
            const formId = this.currentMode === 'dpp' ? 'dpp-report-form' : 'avenue-report-form';
            const reviewId = this.currentMode === 'dpp' ? 'dpp-report-review' : 'avenue-report-review';
            const form = document.getElementById(formId);
            const container = document.getElementById(reviewId);
            if (!form || !container) return;

            const fd = new FormData(form);
            const e = this.currentEvent;
            const att = this.collectAttendance(fd);

            container.innerHTML = `
                <div class="space-y-4">
                    <div class="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                        <p class="text-sm font-black text-brand-blue">${window.AdminPanel.esc(fd.get('project_title') || e.event_name)}</p>
                        <p class="text-xs text-slate-500 mt-1">${window.AdminPanel.fmtDate(e.date)} &bull; ${window.AdminPanel.esc(fd.get('report_venue') || e.venue)}</p>
                    </div>

                    ${this.currentMode === 'dpp' ? `
                        <div class="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
                            <div class="grid grid-cols-2 gap-4 text-xs">
                                <div><span class="text-[9px] text-slate-400 uppercase font-black block">DPP Pillar</span><span class="font-bold">${window.AdminPanel.esc(fd.get('dpp_pillar'))}</span></div>
                                <div><span class="text-[9px] text-slate-400 uppercase font-black block">Category</span><span class="font-bold">${fd.get('dpp_category') ? 'Category ' + this.esc(fd.get('dpp_category')) : '---'}</span></div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-center">
                            <p class="text-[9px] text-blue-500 font-black uppercase">Beneficiaries</p>
                            <p class="text-xl font-black text-blue-600 mt-0.5">${fd.get('beneficiaries_count') || 0}</p>
                        </div>
                        <div class="p-3 rounded-xl bg-green-500/5 border border-green-500/15 text-center">
                            <p class="text-[9px] text-green-500 font-black uppercase">Volunteers</p>
                            <p class="text-xl font-black text-green-600 mt-0.5">${fd.get('volunteers_count') || 0}</p>
                        </div>
                        <div class="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 text-center">
                            <p class="text-[9px] text-purple-500 font-black uppercase">Service Hours</p>
                            <p class="text-xl font-black text-purple-600 mt-0.5">${fd.get('service_hours') || 0}</p>
                        </div>
                        <div class="p-3 rounded-xl bg-orange-500/5 border border-orange-500/15 text-center">
                            <p class="text-[9px] text-orange-500 font-black uppercase">Budget (INR)</p>
                            <p class="text-xl font-black text-orange-600 mt-0.5">₹${fd.get('amount_spent') || 0}</p>
                        </div>
                    </div>

                    <div class="p-3 rounded-xl bg-white/20 border border-white/10 text-xs">
                        <p><strong>Chair(s):</strong> ${window.AdminPanel.esc(fd.get('project_chairs'))}</p>
                        <p class="mt-1"><strong>Proposed:</strong> ${window.AdminPanel.esc(fd.get('proposed_by'))} &bull; <strong>Seconded:</strong> ${window.AdminPanel.esc(fd.get('seconded_by'))}</p>
                    </div>

                    <div class="p-3 rounded-xl bg-white/20 border border-white/10 text-xs">
                        <p class="text-[9px] text-slate-400 uppercase font-black mb-1">Attendance</p>
                        <p><strong>Council:</strong> ${att.council_members_count} &bull; <strong>Trainers:</strong> ${att.trainers_count} &bull; <strong>Rotarians:</strong> ${att.rotarians_count} &bull; <strong>Interactors:</strong> ${att.interactors_count}</p>
                        ${att._council.length ? `<p class="mt-2 text-[9px] text-slate-400 uppercase font-black">Council Members</p>${att._council.map(p => `<p>${this.esc(p.name)} <span class="text-slate-400">(${this.esc(p.portfolio || 'N/A')})</span></p>`).join('')}` : ''}
                        ${att._trainers.length ? `<p class="mt-2 text-[9px] text-slate-400 uppercase font-black">Trainers</p>${att._trainers.map(p => `<p>${this.esc(p.name)} <span class="text-slate-400">(${this.esc(p.portfolio || 'N/A')})</span></p>`).join('')}` : ''}
                    </div>

                    <div class="p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                        <p class="text-[10px] text-green-600 font-black uppercase mb-2"><i class="fa-solid fa-circle-check mr-1"></i> ${this.reportPhotos.length} Watermarked Photos Loaded</p>
                        <div class="flex gap-2 overflow-x-auto">
                            ${this.reportPhotos.map(p => `<img src="${p.url}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0" alt="">`).join('')}
                        </div>
                    </div>
                </div>
            `;
        },

        // ==========================================
        // 14. SUBMISSION
        // ==========================================
        async submitAvenueReport() {
            const form = document.getElementById('avenue-report-form');
            if (!form) return;
            const fd = new FormData(form);
            const action = fd.get('report_action') || 'save_draft';
            const btn = document.getElementById('report-submit-btn');
            btn.disabled = true;

            try {
                await this.saveReportData(fd, action);
                toast.success(action === 'submit' ? 'Report submitted & exported successfully' : 'Draft saved');
                const submittedEventId = this.currentEvent.id;
                if (action === 'submit') await this.generateDocument(submittedEventId, 'docx');
                this.clearDraft();
                window.AdminPanel.closeModal();
                await this.render(window.AdminPanel.workspace);
                if (action === 'submit' && confirm('Report submitted. Email the report PDF with photographs to all members now?')) {
                    await this.emailReport(submittedEventId, true);
                }
            } catch (e) {
                toast.error('Failed: ' + e.message);
            } finally {
                btn.disabled = false;
            }
        },

        async submitDPPReport() {
            const form = document.getElementById('dpp-report-form');
            if (!form) return;
            const fd = new FormData(form);
            const action = fd.get('report_action') || 'save_draft';
            const btn = document.getElementById('report-submit-btn');
            btn.disabled = true;

            try {
                await window.DB_ADMIN.from('events').update({
                    dpp_pillar: fd.get('dpp_pillar'),
                    dpp_category: fd.get('dpp_category'),
                    pillar_alignment_reason: fd.get('pillar_alignment_reason')
                }).eq('id', this.currentEvent.id);

                await this.saveReportData(fd, action);
                toast.success(action === 'submit' ? 'DPP Report submitted & exported' : 'DPP draft saved');
                const submittedEventId = this.currentEvent.id;
                if (action === 'submit') await this.generateDocument(submittedEventId, 'docx');
                this.clearDraft();
                window.AdminPanel.closeModal();
                await this.render(window.AdminPanel.workspace);
                if (action === 'submit' && confirm('Report submitted. Email the report PDF with photographs to all members now?')) {
                    await this.emailReport(submittedEventId, true);
                }
            } catch (e) {
                toast.error('Failed: ' + e.message);
            } finally {
                btn.disabled = false;
            }
        },

        async saveReportData(fd, action) {
            const eventId = this.currentEvent.id;
            const reportText = [
                fd.get('objectives') && `**Objectives:**\n${fd.get('objectives')}`,
                fd.get('description') && `\n\n**Description:**\n${fd.get('description')}`,
                fd.get('impact_outcomes') && `\n\n**Impact & Outcomes:**\n${fd.get('impact_outcomes')}`,
                fd.get('sustainability') && `\n\n**Sustainability/Follow-up:**\n${fd.get('sustainability')}`
            ].filter(Boolean).join('');

            const att = this.collectAttendance(fd);

            const updates = {
                report_text: reportText,
                report_submitted: action === 'submit',
                report_submitted_at: action === 'submit' ? new Date().toISOString() : null,
                report_submitted_by: action === 'submit' ? window.AuthManager?.currentUser?.id : null,
                event_chair: fd.get('project_chairs') || this.currentEvent.event_chair,
                event_secretary: fd.get('event_secretary') || this.currentEvent.event_secretary,
                event_proposed_by: fd.get('proposed_by') || this.currentEvent.event_proposed_by,
                event_seconded_by: fd.get('seconded_by') || this.currentEvent.event_seconded_by,
                venue: fd.get('report_venue') || this.currentEvent.venue,
                beneficiaries_count: parseInt(fd.get('beneficiaries_count'), 10) || 0,
                volunteers_count: parseInt(fd.get('volunteers_count'), 10) || 0,
                service_hours: parseFloat(fd.get('service_hours')) || 0,
                amount_spent: parseFloat(fd.get('amount_spent')) || 0,
                council_members_count: att.council_members_count,
                trainers_count: att.trainers_count,
                rotarians_count: att.rotarians_count,
                interactors_count: att.interactors_count,
                council_members_details: att.council_members_details,
                trainers_details: att.trainers_details,
                status: action === 'submit' ? 'completed' : this.currentEvent.status
            };

            if (fd.get('collaborator_name')) updates.collaborator_name = fd.get('collaborator_name');

            const { error } = await window.DB_ADMIN.from('events').update(updates).eq('id', eventId);
            if (error) throw error;

            const newPhotos = this.reportPhotos.filter(p => !p.existing);
            if (newPhotos.length > 0) {
                const inserts = newPhotos.map((p, i) => ({
                    event_id: eventId,
                    photo_url: p.url,
                    storage_provider: p.provider,
                    caption: p.caption || '',
                    is_report_photo: true,
                    sort_order: i + 1
                }));
                const { error: photoErr } = await window.DB_ADMIN.from('event_photos').insert(inserts);
                if (photoErr) throw photoErr;
            }
        },

        cancelReport() {
            if (!confirm('Discard report editor?')) return;
            window.AdminPanel.closeModal();
        },

        // ==========================================
        // 15. MONTHLY REPORT MODAL
        // ==========================================
        openMonthlyReportModal() {
            const today = new Date().toISOString().substring(0, 7);
            window.AdminPanel.createModal({
                title: 'Generate Monthly Consolidated Report',
                size: 'medium',
                icon: 'calendar-days',
                body: `
                    <form id="monthly-report-form" onsubmit="return false;" class="space-y-4">
                        <div class="admin-form-group">
                            <label class="admin-form-label">Select Month <span class="required">*</span></label>
                            <input type="month" name="month" required class="admin-form-input" value="${today}">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-form-label">Avenue Scope</label>
                            <select name="avenue_filter" class="admin-form-input admin-form-select">
                                <option value="all">All Avenues Consolidated</option>
                                <option value="club_service">Club Service</option>
                                <option value="community_service">Community Service</option>
                                <option value="professional_service">Professional Service</option>
                                <option value="international_service">International Service</option>
                                <option value="dpp">District Priority Projects Only</option>
                            </select>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="window.AdminPanel.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="Reports.triggerMonthlyReportExport('docx')">
                        <i class="fa-solid fa-file-word mr-1.5"></i> Export Word
                    </button>
                    <button class="btn-primary" style="background:#E4345A;" onclick="Reports.triggerMonthlyReportExport('pdf')">
                        <i class="fa-solid fa-file-pdf mr-1.5"></i> Export PDF
                    </button>
                `
            });
        },

        async triggerMonthlyReportExport(format) {
            const form = document.getElementById('monthly-report-form');
            if (!form) return;
            const fd = new FormData(form);
            const monthStr = fd.get('month');
            const avenueFilter = fd.get('avenue_filter');

            let avId = null;
            if (avenueFilter !== 'all' && avenueFilter !== 'dpp') {
                try {
                    const { data: av } = await window.DB_ADMIN.from('avenues').select('id').eq('slug', avenueFilter).single();
                    if (av) avId = av.id;
                } catch (e) {}
            }

            const targetUrl = format === 'pdf' ? this.EDGE_PDF_URL : this.EDGE_DOCX_URL;
            toast.info(`Generating ${format.toUpperCase()} monthly digest...`);

            try {
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.supabaseClient?.supabaseKey || ''}`
                    },
                    body: JSON.stringify({
                        type: 'monthly_report',
                        month: monthStr,
                        avenueId: avId,
                        avenue: avenueFilter === 'dpp' ? 'dpp' : undefined
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Server consolidation failed');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Monthly_Report_${monthStr}.${format}`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Monthly digest generated');
                window.AdminPanel.closeModal();
            } catch (e) {
                toast.error('Export failed: ' + e.message);
            }
        },

        // Emails the submitted report: PDF + attendance block + geo-tagged photos (inline gallery and attachments)
        async emailReport(eventId, silent) {
            const client = window.DB_ADMIN || window.supabaseClient;
            try {
                const { data: ev, error } = await client.from('events').select('*').eq('id', eventId).single();
                if (error || !ev) { toast.error('Event record not found.'); return; }
                if (!ev.report_submitted) { toast.warning('Submit the report first, then email it.'); return; }

                const { data: photoRows } = await client
                    .from('event_photos')
                    .select('photo_url, caption, sort_order')
                    .eq('event_id', eventId)
                    .eq('is_report_photo', true)
                    .order('sort_order');
                const photos = (photoRows || [])
                    .filter(p => /^https?:\/\//i.test(p.photo_url || ''))
                    .map(p => ({ url: p.photo_url, caption: p.caption || '' }));

                if (!silent && !confirm(`Email the report for "${ev.event_name}" to all active members?\n\nIncluded: report PDF, attendance details and ${photos.length} photograph(s).`)) return;

                toast.info('Preparing report email...');
                const recipients = await getMemberRecipients();
                if (recipients.length === 0) { toast.warning('No recipients found.'); return; }

                const files = [];
                try {
                    const resp = await fetch(this.EDGE_PDF_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.supabaseClient?.supabaseKey || ''}` },
                        body: JSON.stringify({ type: 'event_report', eventId })
                    });
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const blob = await resp.blob();
                    if (!blob || blob.size === 0) throw new Error('empty document');
                    const safe = String(ev.event_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                    files.push({ name: `Project_Report_${safe}.pdf`, mime: 'application/pdf', base64: await blobToBase64(blob) });
                } catch (pdfErr) {
                    console.warn('Report PDF could not be attached:', pdfErr);
                    toast.warning('Report PDF could not be generated; the email will go without it.');
                }

                const result = await postToScript({
                    type: 'report_approved',
                    report_status: 'submitted',
                    recipients,
                    event: {
                        event_name: ev.event_name, date: ev.date, venue: ev.venue, avenue_slug: ev.avenue_slug,
                        is_dpp: !!ev.is_dpp, dpp_project_number: ev.dpp_project_number, dpp_pillar: ev.dpp_pillar, dpp_category: ev.dpp_category,
                        beneficiaries_count: ev.beneficiaries_count, volunteers_count: ev.volunteers_count, service_hours: ev.service_hours,
                        council_members_count: ev.council_members_count, trainers_count: ev.trainers_count,
                        rotarians_count: ev.rotarians_count, interactors_count: ev.interactors_count,
                        council_members_details: ev.council_members_details, trainers_details: ev.trainers_details
                    },
                    photos,
                    files,
                    sender: currentSender()
                });

                toast.success(`Report emailed to ${result.recipients_count || recipients.length} members.`);
                if (window.AdminPanel?.logActivity) window.AdminPanel.logActivity('REPORT_EMAIL', 'event', eventId, { recipients: recipients.length, photos: photos.length });
            } catch (e) {
                console.error('Report email failed:', e);
                toast.error('Email failed: ' + e.message);
            }
        },

        async generateDocument(eventId, format) {
            const targetUrl = format === 'pdf' ? this.EDGE_PDF_URL : this.EDGE_DOCX_URL;
            toast.info(`Generating ${format.toUpperCase()}...`);

            try {
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.supabaseClient?.supabaseKey || ''}`
                    },
                    body: JSON.stringify({ type: 'event_report', eventId: eventId })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Server document synthesis failed');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Project_Report_${eventId}.${format}`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success(`${format.toUpperCase()} report compiled`);
            } catch (e) {
                toast.error('Synthesis failed: ' + e.message);
            }
        }
    };

    window.Reports = Reports;
    window.ReportEngine = Reports;
    window.ReportCenter = Reports;

})();