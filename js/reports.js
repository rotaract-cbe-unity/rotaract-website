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
        skipGeo: false,       // true = upload photos without adding our geo-tag stamp
        geoTagMode: 'event',  // location comes from the pasted Google Maps link (or GPS on request)
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

            // Pattern 7: destination= / query= / daddr= with coordinates
            const dest = str.match(/[?&](?:destination|query|daddr|saddr)=(-?\d{1,2}\.\d+)(?:,|%2C)\+?(-?\d{1,3}\.\d+)/i);
            if (dest) {
                return { latitude: parseFloat(dest[1]), longitude: parseFloat(dest[2]) };
            }

            // Pattern 8: /maps/search/lat,+lng or /maps/dir//lat,lng
            const pathCoord = str.match(/\/(?:search|dir|place)\/(?:[^/]*\/)?(-?\d{1,2}\.\d+),\+?(-?\d{1,3}\.\d+)/);
            if (pathCoord) {
                return { latitude: parseFloat(pathCoord[1]), longitude: parseFloat(pathCoord[2]) };
            }

            // Pattern 9: %2C encoded coordinates anywhere in a map URL
            const enc = str.match(/(-?\d{1,2}\.\d{3,})%2C\+?(-?\d{1,3}\.\d{3,})/i);
            if (enc) {
                return { latitude: parseFloat(enc[1]), longitude: parseFloat(enc[2]) };
            }

            return null;
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
        // 4. GEO-TAG STUDIO: paste a Google Maps link, the portal does the rest
        // ==========================================

        // Pulls the place name out of a Google Maps URL (/maps/place/Name+Here/@... or ?q=Name)
        extractPlaceName(input) {
            const s = String(input || '');
            let m = s.match(/\/maps\/place\/([^/@?]+)/i);
            if (m) { try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); } catch (e) { return m[1].replace(/\+/g, ' ').trim(); } }
            m = s.match(/[?&](?:q|query|destination)=([^&]+)/i);
            if (m) {
                try {
                    const t = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
                    if (!/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t)) return t;
                } catch (e) { /* ignore */ }
            }
            return '';
        },

        isShortMapsLink(s) { return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google|g\.page)\b/i.test(String(s || '').trim()); },

        // Short links cannot be opened from a browser directly, so read-only public proxies follow the redirect for us.
        // We look at (1) the final URL after redirects, then (2) the page itself for coordinates.
        async expandShortLink(url) {
            const clean = /^https?:\/\//i.test(url) ? url.trim() : 'https://' + url.trim();
            const enc = encodeURIComponent(clean);
            const fetchT = async (u, ms) => {
                const ctl = new AbortController();
                const t = setTimeout(() => ctl.abort(), ms || 8000);
                try { return await fetch(u, { signal: ctl.signal }); } finally { clearTimeout(t); }
            };
            const fromHtml = (html) => {
                const m = html.match(/center=(-?\d{1,2}\.\d+)(?:%2C|,)(-?\d{1,3}\.\d+)/i)
                    || html.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)
                    || html.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/)
                    || html.match(/\[null,null,(-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})\]/)
                    || html.match(/"latitude"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"longitude"\s*:\s*(-?\d{1,3}\.\d+)/)
                    || html.match(/ll=(-?\d{1,2}\.\d+)(?:%2C|,)(-?\d{1,3}\.\d+)/i);
                if (!m) return null;
                const t2 = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
                return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]), name: t2 ? t2[1].replace(/\s*[\u00B7-]\s*Google Maps.*$/i, '').trim() : '' };
            };
            const tries = [
                async () => { // allorigins JSON: tells us the final URL after redirects
                    const r = await fetchT('https://api.allorigins.win/get?url=' + enc); if (!r.ok) return null;
                    const j = await r.json();
                    const fin = (j && j.status && j.status.url) || '';
                    const c = this.parseGoogleMapsUrl(fin);
                    if (c) return { latitude: c.latitude, longitude: c.longitude, name: this.extractPlaceName(fin) };
                    return fromHtml(String((j && j.contents) || '')) || (this.extractPlaceName(fin) ? { name: this.extractPlaceName(fin) } : null);
                },
                async () => { const r = await fetchT('https://corsproxy.io/?' + enc); if (!r.ok) return null; const h = await r.text(); return fromHtml(h); },
                async () => { const r = await fetchT('https://api.codetabs.com/v1/proxy?quest=' + enc); if (!r.ok) return null; const h = await r.text(); return fromHtml(h); },
                async () => { const r = await fetchT('https://api.allorigins.win/raw?url=' + enc); if (!r.ok) return null; const h = await r.text(); return fromHtml(h); }
            ];
            let nameOnly = null;
            for (const t of tries) {
                try {
                    const res = await t();
                    if (res && res.latitude != null) return res;
                    if (res && res.name && !nameOnly) nameOnly = res;
                } catch (e) { /* try the next proxy */ }
            }
            return nameOnly; // may carry only a place name, which can still be geocoded
        },

        // Compact "Venue, Area, City" name for the photo stamp
        buildShortName(data, hint) {
            const a = (data && data.address) || {};
            const primary = hint || data?.name || a.amenity || a.building || a.shop || a.tourism || a.leisure || a.office || a.road || '';
            const area = a.suburb || a.neighbourhood || a.village || a.city_district || '';
            const city = a.city || a.town || a.county || a.state_district || '';
            const parts = [primary, area, city].filter(Boolean);
            const seen = new Set();
            const out = parts.filter(p => { const k = p.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
            return out.join(', ') || (data?.display_name || '').split(',').slice(0, 3).join(',').trim();
        },

        async reverseGeocodeCustom(lat, lng, hint) {
            try {
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}&zoom=18`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await resp.json();
                return {
                    address: data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    name: this.buildShortName(data, hint),
                    city: data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || 'Coimbatore',
                    state: data?.address?.state || 'Tamil Nadu'
                };
            } catch (e) {
                return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, name: hint || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, city: 'Coimbatore', state: 'Tamil Nadu' };
            }
        },

        // Event window used for the random photo timings
        getEventWindow() {
            const e = this.currentEvent || {};
            const toMin = (t) => {
                if (!t) return null;
                const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
                if (!m) return null;
                let h = parseInt(m[1], 10); const mi = parseInt(m[2], 10);
                if (m[3]) { const pm = m[3].toUpperCase() === 'PM'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
                return h * 60 + mi;
            };
            let start = toMin(e.start_time); let end = toMin(e.end_time);
            if (start == null) start = 10 * 60;
            if (end == null || end <= start) end = Math.min(start + 120, 23 * 60 + 59);
            let date = null;
            if (e.date) { const m = String(e.date).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) date = new Date(+m[1], +m[2] - 1, +m[3]); }
            return { date: date || new Date(), hasDate: !!date, start, end };
        },

        fmtClock(mins) {
            const h24 = Math.floor(mins / 60) % 24, m = mins % 60;
            const ap = h24 >= 12 ? 'PM' : 'AM';
            return `${(h24 % 12) || 12}:${String(m).padStart(2, '0')} ${ap}`;
        },

        // n random, ascending moments between the event's start and end (to the second)
        randomStamps(n) {
            const w = this.getEventWindow();
            const span = Math.max(60, (w.end - w.start) * 60);
            const secs = Array.from({ length: n }, () => Math.floor(Math.random() * span)).sort((a, b) => a - b);
            return secs.map(s => {
                const d = new Date(w.date.getFullYear(), w.date.getMonth(), w.date.getDate(), 0, 0, 0);
                d.setSeconds(w.start * 60 + s);
                return d;
            });
        },

        async resolveGeoLink(rawInput, opts) {
            const input = String(rawInput || '').trim();
            if (!input) { if (!(opts && opts.silent)) toast.warning('Paste a Google Maps link first.'); return false; }
            this.setGeoBusy(true, 'Reading the location...');
            try {
                let coords = this.parseGoogleMapsUrl(input);
                let hint = this.extractPlaceName(input);

                if (!coords && this.isShortMapsLink(input)) {
                    this.setGeoBusy(true, 'Opening the short link...');
                    const ex = await this.expandShortLink(input);
                    if (ex && ex.latitude != null) { coords = { latitude: ex.latitude, longitude: ex.longitude }; hint = hint || ex.name; }
                    else if (ex && ex.name) { hint = ex.name; }
                    else { this.showGeoFail(input); return false; }
                }
                if (!coords) {
                    const forward = await this.forwardGeocode(hint || input);
                    if (forward) coords = { latitude: forward.latitude, longitude: forward.longitude };
                }
                if (!coords) { this.showGeoFail(input); return false; }
                this.showGeoFail('');

                this.setGeoBusy(true, 'Finding the place name...');
                const addr = await this.reverseGeocodeCustom(coords.latitude, coords.longitude, hint);
                this.customLocation = {
                    latitude: coords.latitude, longitude: coords.longitude,
                    address: addr.address, name: addr.name, city: addr.city, state: addr.state, sourceInput: input
                };
                this.geoTagMode = 'event';
                this.saveGeoState();
                this.applyActiveLocation();
                await this.updateGeoStudio();
                toast.success('Location found: ' + (this.customLocation.name || 'ready'));
                return true;
            } catch (e) {
                console.warn('resolveGeoLink', e);
                toast.error('Could not read that location.');
                return false;
            } finally {
                this.setGeoBusy(false);
            }
        },

        async useMyGps() {
            this.setGeoBusy(true, 'Getting your GPS position...');
            try {
                await this.requestLiveGeoLocation();
                if (!this.liveLocation) { toast.error('GPS is unavailable. Paste a Google Maps link instead.'); return; }
                const addr = await this.reverseGeocodeCustom(this.liveLocation.latitude, this.liveLocation.longitude, '');
                this.customLocation = { latitude: this.liveLocation.latitude, longitude: this.liveLocation.longitude, address: addr.address, name: addr.name, city: addr.city, state: addr.state, sourceInput: 'GPS' };
                this.saveGeoState();
                this.applyActiveLocation();
                await this.updateGeoStudio();
                toast.success('Using your current location');
            } finally { this.setGeoBusy(false); }
        },

        showGeoFail(link) {
            const el = document.getElementById('geo-fail');
            if (!el) { if (link) toast.error('Could not read that link. Paste the full link from the Maps address bar.'); return; }
            if (!link) { el.classList.add('hidden'); el.innerHTML = ''; return; }
            const safe = this.esc(link);
            el.classList.remove('hidden');
            el.innerHTML = `<div><b><i class="fa-solid fa-circle-exclamation"></i> Could not read this link automatically</b>
                <p>Short links sometimes cannot be opened from the browser. Any one of these works:</p>
                <ol><li>Tap <b>Open link</b>, then copy the long address from the Maps address bar and paste it here.</li>
                <li>Or type the venue name (for example <i>Codissia Trade Fair Complex, Coimbatore</i>) and press Find.</li>
                <li>Or paste coordinates like <i>11.0275, 77.0270</i>.</li></ol>
                <a class="btn-secondary btn-sm" href="${safe}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Open link</a></div>`;
        },

        // "Upload as-is" mode: photos that already carry a geo-tag from another app are not stamped again
        setStampMode(stamp) {
            this.skipGeo = !stamp;
            document.querySelectorAll('[data-stampmode]').forEach(b => b.classList.toggle('on', (b.dataset.stampmode === 'stamp') === !!stamp));
            const wrap = document.getElementById('geo-studio-wrap');
            if (wrap) wrap.classList.toggle('geo-dim', this.skipGeo);
            const note = document.getElementById('geo-skip-note');
            if (note) note.classList.toggle('hidden', !this.skipGeo);
            this.updateUploadGate();
            this.renderExistingPhotos();
        },

        setGeoBusy(on, text) {
            const el = document.getElementById('geo-busy');
            if (!el) return;
            el.classList.toggle('hidden', !on);
            const t = el.querySelector('span'); if (t && text) t.textContent = text;
        },

        saveGeoState() {
            try { if (this.currentEvent && this.customLocation) localStorage.setItem('geo_cfg_' + this.currentEvent.id, JSON.stringify(this.customLocation)); } catch (e) { /* storage unavailable */ }
        },
        restoreGeoState(eventId) {
            this.customLocation = null; this._mapCache = null;
            try { const s = localStorage.getItem('geo_cfg_' + eventId); if (s) this.customLocation = JSON.parse(s); } catch (e) { /* ignore */ }
            this.applyActiveLocation();
        },

        onGeoLinkInput(el, immediate) {
            clearTimeout(this._geoTimer);
            const v = el.value.trim();
            if (!v) return;
            const looksLike = /^https?:\/\//i.test(v) || /goo\.gl|maps\.app|google\.[a-z.]+\/maps|^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/i.test(v);
            if (!looksLike) return;
            this._geoTimer = setTimeout(() => this.resolveGeoLink(v, { silent: true }), immediate ? 80 : 700);
        },

        onGeoNameChange(v) {
            if (!this.customLocation) return;
            this.customLocation.name = String(v || '').trim();
            this.applyActiveLocation();
            this.saveGeoState();
            this.renderGeoPreview();
        },

        // Kept so any older button that opened the modal still works: it simply focuses the link box
        openGeoTagConfigModal() {
            const el = document.getElementById('geo-link-input');
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
        },

        // ---- Mini map: Google-Maps-style "Voyager" tiles (retina) drawn to a canvas, OSM as fallback ----
        async buildMapCanvas(lat, lng, size, zoom) {
            const key = [lat.toFixed(5), lng.toFixed(5), size, zoom].join('|');
            if (this._mapCache && this._mapCache.key === key) return this._mapCache.canvas;
            const z = zoom || 17;
            const n = Math.pow(2, z);
            const fx = (lng + 180) / 360 * n;
            const lr = lat * Math.PI / 180;
            const fy = (1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n;
            const tx = Math.floor(fx), ty = Math.floor(fy);
            const load = (url) => new Promise(res => {
                const im = new Image(); im.crossOrigin = 'anonymous';
                const t = setTimeout(() => res(null), 6000);
                im.onload = () => { clearTimeout(t); res(im); };
                im.onerror = () => { clearTimeout(t); res(null); };
                im.src = url;
            });
            const wrap = (x) => ((x % n) + n) % n;
            const sub = ['a', 'b', 'c', 'd'];
            const sources = [
                { px: 512, url: (x, y, i) => `https://${sub[i % 4]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${wrap(x)}/${y}@2x.png` },
                { px: 256, url: (x, y) => `https://tile.openstreetmap.org/${z}/${wrap(x)}/${y}.png` }
            ];
            let big = null, unit = 256;
            for (const src of sources) {
                const c = document.createElement('canvas'); c.width = c.height = src.px * 3;
                const cx2 = c.getContext('2d'); cx2.fillStyle = '#e8eaed'; cx2.fillRect(0, 0, c.width, c.height);
                const jobs = []; let i = 0;
                for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) jobs.push(load(src.url(tx + dx, ty + dy, i++)).then(im => ({ im, dx, dy })));
                const tiles = await Promise.all(jobs);
                const ok = tiles.filter(t => t.im);
                if (ok.length >= 5) {
                    ok.forEach(t => cx2.drawImage(t.im, (t.dx + 1) * src.px, (t.dy + 1) * src.px, src.px, src.px));
                    big = c; unit = src.px; break;
                }
            }
            if (!big) {
                big = document.createElement('canvas'); big.width = big.height = 768; unit = 256;
                const g = big.getContext('2d'); g.fillStyle = '#e8eaed'; g.fillRect(0, 0, 768, 768);
                g.strokeStyle = '#fff'; g.lineWidth = 10; for (let i = 0; i <= 768; i += 96) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 768); g.moveTo(0, i); g.lineTo(768, i); g.stroke(); }
            }
            const cx = (fx - tx + 1) * unit, cy = (fy - ty + 1) * unit;
            const out = document.createElement('canvas'); out.width = out.height = size;
            const octx = out.getContext('2d');
            octx.imageSmoothingQuality = 'high';
            // `size` px of output cover size/2 standard 256px tile-pixels, i.e. a street-level view
            const crop = (size / 2) * (unit / 256);
            octx.drawImage(big, cx - crop / 2, cy - crop / 2, crop, crop, 0, 0, size, size);
            this._mapCache = { key, canvas: out };
            return out;
        },

        // Re-renders the result card + preview + upload gate without touching the link box
        async updateGeoStudio() {
            const box = document.getElementById('geo-result');
            if (!box) return;
            const loc = this.activeLocation;
            const w = this.getEventWindow();
            const e = this.currentEvent || {};
            const cfg = this.AVENUE_CONFIG[e.is_dpp ? 'dpp' : e.avenue_slug] || { color: '#3B82F6', label: 'Project' };
            const dateTxt = w.date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
            box.innerHTML = `
                <div class="geo-grid">
                    <div class="geo-fact"><i class="fa-solid fa-calendar-day" style="color:${cfg.color}"></i><div><small>Event date</small><b>${this.esc(dateTxt)}</b>${w.hasDate ? '' : '<em>No date on this project, using today</em>'}</div></div>
                    <div class="geo-fact"><i class="fa-solid fa-clock" style="color:#f59e0b"></i><div><small>Photo times (random)</small><b>${this.fmtClock(w.start)} &ndash; ${this.fmtClock(w.end)}</b></div></div>
                    <div class="geo-fact"><i class="fa-solid fa-location-dot" style="color:#10b981"></i><div><small>Coordinates</small><b class="mono">${loc ? this.esc(loc.latitude.toFixed(6) + ', ' + loc.longitude.toFixed(6)) : 'Waiting for a link'}</b></div></div>
                </div>
                ${loc ? `
                <label class="geo-namebox"><span><i class="fa-solid fa-pen"></i> Location name on photos <small>(editable)</small></span>
                    <input type="text" class="admin-form-input" id="geo-name-input" maxlength="90" value="${this.esc(this.activeLocationName || '')}" onchange="Reports.onGeoNameChange(this.value)" oninput="Reports.onGeoNameChange(this.value)"></label>` : ''}
                <div class="geo-preview-wrap ${loc ? '' : 'geo-empty'}">
                    ${loc ? '<canvas id="geo-preview-canvas" width="1600" height="1200"></canvas>' : '<div class="geo-empty-msg"><i class="fa-solid fa-map-location-dot"></i><p>Paste a Google Maps link above and a live preview of the photo stamp appears here.</p></div>'}
                </div>`;
            this.updateUploadGate();
            if (loc) await this.renderGeoPreview();
        },

        async renderGeoPreview() {
            const cv = document.getElementById('geo-preview-canvas');
            if (!cv || !this.activeLocation) return;
            const ctx = cv.getContext('2d');
            const g = ctx.createLinearGradient(0, 0, 1600, 1200);
            g.addColorStop(0, '#1e3a5f'); g.addColorStop(0.5, '#3b5b8c'); g.addColorStop(1, '#7c5cbf');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 1200);
            ctx.fillStyle = 'rgba(255,255,255,.07)';
            ctx.beginPath(); ctx.arc(1180, 360, 330, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(380, 520, 220, 0, 7); ctx.fill();
            ctx.font = '700 54px Poppins, "Segoe UI", Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.textAlign = 'center';
            ctx.fillText('Your photo appears here', 800, 520); ctx.textAlign = 'start';
            let map = null;
            try { map = await this.buildMapCanvas(this.activeLocation.latitude, this.activeLocation.longitude, 480, 17); } catch (e) { /* offline */ }
            const stamp = this.randomStamps(1)[0];
            this.drawWatermarkOverlay(ctx, 1600, 1200, map, this.buildStampInfo(stamp));
        },

        updateUploadGate() {
            const has = !!this.activeLocation || !!this.skipGeo;
            const zone = document.getElementById('report-photo-upload-zone');
            const input = document.getElementById('report-photo-input');
            if (zone) zone.classList.toggle('geo-locked', !has);
            if (input) input.disabled = !has;
            const t = document.getElementById('geo-drop-title');
            if (t) t.textContent = has ? 'Drop photos here or tap to browse' : 'Paste the location link first';
            const s = document.getElementById('geo-status-pill');
            if (s) { s.className = 'geo-pill ' + (has ? 'ok' : 'warn'); s.innerHTML = this.skipGeo ? '<i class="fa-solid fa-image"></i> Upload as-is' : (has ? '<i class="fa-solid fa-circle-check"></i> Ready to stamp' : '<i class="fa-solid fa-triangle-exclamation"></i> Location needed'); }
        },

        applyActiveLocation() {
            const loc = this.customLocation || this.liveLocation;
            if (loc) {
                this.activeLocation = loc;
                this.activeLocationName = loc.name || loc.address || `${loc.city || 'Coimbatore'}, Tamil Nadu`;
            } else {
                this.activeLocation = null;
                this.activeLocationName = '';
            }
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

                // Location link is remembered per project; dates and times always come from the project itself
                this.restoreGeoState(event.id);

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
        // 10. PHOTO UPLOAD: geo-tag studio + fixed 4:3 slot grid
        // ==========================================
        renderPhotoUploadSection() {
            const has = !!this.activeLocation;
            const cfg = this.AVENUE_CONFIG[(this.currentEvent && this.currentEvent.is_dpp) ? 'dpp' : (this.currentEvent && this.currentEvent.avenue_slug)] || { color: '#3B82F6', label: 'Project', icon: 'fa-star' };
            const evName = this.esc((this.currentEvent && this.currentEvent.event_name) || 'Project');
            const prefill = this.esc((this.customLocation && this.customLocation.sourceInput && this.customLocation.sourceInput !== 'GPS') ? this.customLocation.sourceInput : '');
            return `
                <style>${this.geoStudioCSS()}</style>
                <div class="admin-panel geo-panel" style="--gc:${cfg.color}">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-camera"></i> Geo-Tagged Photographs</h3>
                        <span class="badge badge-blue" id="photo-count-badge">${this.reportPhotos.length}/${this.maxPhotos}</span>
                    </div>
                    <div class="admin-panel-body space-y-4">

                        <div class="geo-hero">
                            <div class="geo-hero-ico"><i class="fa-solid ${cfg.icon || 'fa-location-dot'}"></i></div>
                            <div class="geo-hero-txt">
                                <p class="geo-hero-kicker">${this.esc(cfg.label)} &middot; Geo-Tag Studio</p>
                                <h4>${evName}</h4>
                                <p>Paste one Google Maps link. We read the place, draw the map and stamp every photo with the event name, location, coordinates, date and a time within the event hours.</p>
                            </div>
                            <span id="geo-status-pill" class="geo-pill ${has ? 'ok' : 'warn'}">${this.skipGeo ? '<i class="fa-solid fa-image"></i> Upload as-is' : (has ? '<i class="fa-solid fa-circle-check"></i> Ready to stamp' : '<i class="fa-solid fa-triangle-exclamation"></i> Location needed')}</span>
                        </div>

                        <div class="geo-seg" role="tablist" aria-label="Geo-tag stamp">
                            <button type="button" data-stampmode="stamp" class="${this.skipGeo ? '' : 'on'}" onclick="Reports.setStampMode(true)"><i class="fa-solid fa-location-dot"></i><span><b>Add geo-tag stamp</b><small>Map, place, date and time on every photo</small></span></button>
                            <button type="button" data-stampmode="asis" class="${this.skipGeo ? 'on' : ''}" onclick="Reports.setStampMode(false)"><i class="fa-solid fa-image"></i><span><b>Skip geo-tagging</b><small>Photos already geo-tagged elsewhere</small></span></button>
                        </div>
                        <p id="geo-skip-note" class="geo-note ${this.skipGeo ? '' : 'hidden'}"><i class="fa-solid fa-circle-info"></i> Photos are uploaded without our stamp. They are fitted into the 4:3 frame whole, with nothing cut off, so existing stamps stay readable.</p>
                        <div id="geo-studio-wrap" class="${this.skipGeo ? 'geo-dim' : ''}">
                        <div class="geo-linkrow">
                            <div class="geo-linkbox">
                                <i class="fa-solid fa-link"></i>
                                <input type="text" id="geo-link-input" class="admin-form-input" autocomplete="off" spellcheck="false"
                                    placeholder="Paste Google Maps link (full link, short link or lat, lng)" value="${prefill}"
                                    oninput="Reports.onGeoLinkInput(this)" onpaste="setTimeout(()=>Reports.onGeoLinkInput(this,true),30)"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault();Reports.resolveGeoLink(this.value)}">
                                <button type="button" class="btn-primary btn-sm" onclick="Reports.resolveGeoLink(document.getElementById('geo-link-input').value)"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Find</button>
                            </div>
                            <button type="button" class="btn-secondary btn-sm" onclick="Reports.useMyGps()"><i class="fa-solid fa-satellite-dish mr-1"></i>Use my GPS</button>
                        </div>
                        <div id="geo-busy" class="geo-busy hidden"><i class="fa-solid fa-spinner fa-spin"></i><span>Reading the location...</span></div>

                        <div id="geo-fail" class="geo-fail hidden"></div>
                        <div id="geo-result"></div>
                        </div>

                        <div class="geo-drop ${(has || this.skipGeo) ? '' : 'geo-locked'}" id="report-photo-upload-zone">
                            <input type="file" id="report-photo-input" accept="image/*" multiple class="geo-file" ${(has || this.skipGeo) ? '' : 'disabled'}>
                            <div class="geo-drop-ico"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                            <div class="geo-drop-txt">
                                <b id="geo-drop-title">${(has || this.skipGeo) ? 'Drop photos here or tap to browse' : 'Paste the location link first'}</b>
                                <small>Photos are cropped to a neat 4:3 frame and stamped automatically &middot; ${this.minPhotos}&ndash;${this.maxPhotos} photos</small>
                            </div>
                        </div>

                        <div class="geo-progress">
                            <div class="geo-bar"><i id="geo-bar-fill" style="width:${Math.min(100, this.reportPhotos.length / this.maxPhotos * 100)}%"></i></div>
                            <span id="geo-bar-text"></span>
                        </div>

                        <div id="photo-processing" class="geo-busy hidden"><i class="fa-solid fa-spinner fa-spin"></i><span id="photo-processing-text">Stamping photos...</span></div>

                        <div id="report-photos-grid" class="geo-slots"></div>
                    </div>
                </div>
            `;
        },

        geoStudioCSS() {
            return `
.geo-panel .geo-hero{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px;border-radius:18px;border:1px solid color-mix(in srgb,var(--gc) 35%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--gc) 14%,transparent),rgba(124,58,237,.06))}
.geo-hero-ico{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:20px;color:#fff;background:var(--gc);flex:0 0 48px}
.geo-hero-txt{flex:1;min-width:200px}.geo-hero-kicker{margin:0;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--gc)}
.geo-hero-txt h4{margin:2px 0 4px;font-size:16px;font-weight:800}.geo-hero-txt p:last-child{margin:0;font-size:11px;line-height:1.5;opacity:.7}
.geo-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap}
.geo-pill.ok{background:rgba(16,185,129,.14);color:#059669}.geo-pill.warn{background:rgba(245,158,11,.16);color:#b45309}
.geo-linkrow{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
.geo-linkbox{flex:1;min-width:240px;display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:14px;border:1.5px solid rgba(148,163,184,.4);background:rgba(148,163,184,.08)}
.geo-linkbox:focus-within{border-color:var(--gc);box-shadow:0 0 0 3px color-mix(in srgb,var(--gc) 20%,transparent)}
.geo-linkbox>i{color:var(--gc)}.geo-linkbox .admin-form-input{flex:1;min-width:0;border:0!important;background:transparent!important;box-shadow:none!important;padding:8px 4px!important}
.geo-busy.hidden{display:none!important}.geo-busy{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);font-size:12px;font-weight:700;color:#2563eb}
.geo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.geo-fact{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.3);background:rgba(148,163,184,.07)}
.geo-fact>i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(148,163,184,.15);flex:0 0 34px}
.geo-fact small{display:block;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.6}.geo-fact b{display:block;font-size:13px;font-weight:800}.geo-fact b.mono{font-family:ui-monospace,Consolas,monospace;font-size:12px}.geo-fact em{display:block;font-size:9px;color:#d97706;font-style:normal}
.geo-namebox{display:block;margin-top:12px}.geo-namebox>span{display:block;font-size:11px;font-weight:800;margin-bottom:6px}.geo-namebox small{font-weight:600;opacity:.6}
.geo-preview-wrap{margin-top:12px;border-radius:18px;overflow:hidden;border:1px solid rgba(148,163,184,.3);aspect-ratio:4/3;max-width:640px;background:rgba(148,163,184,.08)}
.geo-preview-wrap canvas{display:block;width:100%;height:100%}
.geo-empty{display:grid;place-items:center;aspect-ratio:auto;min-height:140px;max-width:none;border-style:dashed}
.geo-empty-msg{text-align:center;padding:20px;font-size:12px;opacity:.65}.geo-empty-msg i{font-size:28px;color:var(--gc);margin-bottom:8px;display:block}.geo-empty-msg p{margin:0}
.geo-drop{position:relative;display:flex;align-items:center;gap:16px;min-height:112px;flex-shrink:0;padding:18px 22px;border-radius:20px;border:2px dashed color-mix(in srgb,var(--gc) 55%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--gc) 8%,transparent),transparent);cursor:pointer;transition:background .15s,border-color .15s}
.geo-drop:hover,.geo-drop.over{background:color-mix(in srgb,var(--gc) 14%,transparent);border-style:solid}
.geo-drop.geo-locked{opacity:.55;cursor:not-allowed;border-color:rgba(148,163,184,.5)}.geo-drop.geo-locked .geo-file{pointer-events:none}
.geo-file{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:2}
.geo-drop-ico{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;font-size:24px;color:#fff;background:linear-gradient(135deg,var(--gc),#7c3aed);flex:0 0 56px}
.geo-drop-txt b{display:block;font-size:14px;font-weight:800}.geo-drop-txt small{display:block;font-size:11px;opacity:.65;margin-top:2px}
.geo-progress{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800}.geo-bar{flex:1;height:8px;border-radius:99px;background:rgba(148,163,184,.25);overflow:hidden}.geo-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gc),#7c3aed);transition:width .3s}
.geo-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(min-width:640px){.geo-slots{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1024px){.geo-slots{grid-template-columns:repeat(4,minmax(0,1fr))}}
.geo-slot{position:relative;aspect-ratio:4/3;border-radius:16px;overflow:hidden;border:1px solid rgba(148,163,184,.35);background:rgba(148,163,184,.1)}
.geo-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.geo-slot.empty{display:grid;place-items:center;border:2px dashed rgba(148,163,184,.5);background:repeating-linear-gradient(135deg,transparent 0 10px,rgba(148,163,184,.07) 10px 20px);cursor:pointer;text-align:center;transition:border-color .15s,background .15s}
.geo-slot.empty:hover{border-color:var(--gc);background:color-mix(in srgb,var(--gc) 10%,transparent)}
.geo-slot.empty i{font-size:20px;color:var(--gc);display:block;margin-bottom:6px}.geo-slot.empty b{display:block;font-size:12px;font-weight:800}.geo-slot.empty small{font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.6}
.geo-slot.empty.locked{opacity:.5;cursor:not-allowed}
.geo-num{position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;background:var(--gc);box-shadow:0 2px 6px rgba(0,0,0,.35);z-index:3}
.geo-tools{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px;background:linear-gradient(180deg,rgba(0,0,0,.45),transparent 40%,transparent 55%,rgba(0,0,0,.7));opacity:0;transition:opacity .15s;z-index:4}
.geo-slot:hover .geo-tools,.geo-slot:focus-within .geo-tools,.geo-slot.open .geo-tools{opacity:1}.geo-slot:not(.empty){cursor:pointer}
.geo-btns{display:flex;justify-content:flex-end;gap:6px}.geo-btns button{width:28px;height:28px;border-radius:9px;border:0;background:rgba(255,255,255,.9);color:#0f172a;font-size:11px;cursor:pointer}.geo-btns button.del{background:#ef4444;color:#fff}.geo-btns button:disabled{opacity:.35;cursor:default}
.geo-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:5px;border-radius:16px;background:rgba(148,163,184,.14)}
.geo-seg button{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border-radius:12px;border:1.5px solid transparent;background:transparent;color:inherit;cursor:pointer;min-height:48px}
.geo-seg button>i{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(148,163,184,.2);flex:0 0 32px}
.geo-seg button b{display:block;font-size:12px;font-weight:800}.geo-seg button small{display:block;font-size:10px;opacity:.65;line-height:1.3}
.geo-seg button.on{background:#fff;color:#0f172a;border-color:var(--gc);box-shadow:0 4px 14px -8px rgba(0,0,0,.4)}.geo-seg button.on>i{background:var(--gc);color:#fff}
.dark .geo-seg button.on{background:rgba(255,255,255,.1);color:#fff}
.geo-note{margin:0;padding:10px 12px;border-radius:12px;font-size:11px;line-height:1.5;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2)}.geo-note.hidden{display:none}
.geo-dim{opacity:.45;pointer-events:none;filter:grayscale(.4)}
.geo-fail{padding:14px;border-radius:14px;font-size:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35)}.geo-fail.hidden{display:none}
.geo-fail>div>b:first-child{display:block;margin-bottom:4px}.geo-fail p{margin:0 0 4px}.geo-fail ol{margin:0 0 10px;padding-left:18px;line-height:1.6}
.geo-tagpill{position:absolute;right:8px;top:8px;z-index:3;padding:3px 8px;border-radius:99px;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(15,23,42,.75);color:#fff}
.geo-cap{width:100%;padding:6px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.35);background:rgba(15,23,42,.6);color:#fff;font-size:11px}.geo-cap::placeholder{color:rgba(255,255,255,.65)}
@media(max-width:560px){
 .geo-seg{grid-template-columns:1fr}
 .geo-panel .geo-hero{padding:12px}.geo-hero-txt h4{font-size:15px}
 .geo-linkrow>.btn-secondary{width:100%;justify-content:center;min-height:44px}
 .geo-linkbox{min-width:0;flex-basis:100%}.geo-linkbox .admin-form-input{font-size:16px!important}
 .geo-drop{flex-direction:column;text-align:center;padding:18px 14px;min-height:140px}
 .geo-grid{grid-template-columns:1fr}.geo-namebox .admin-form-input{font-size:16px}
 .geo-slots{gap:8px}.geo-slot.empty i{font-size:16px}.geo-slot.empty b{font-size:11px}
}
@media(pointer:coarse){.geo-btns button{width:34px;height:34px;font-size:13px}.geo-cap{font-size:16px;padding:6px 8px}.geo-tools{padding:6px}.geo-slot .geo-num{width:22px;height:22px}.geo-linkbox button,.geo-linkrow .btn-secondary{min-height:44px}}
`;
        },

        bindPhotoUploadHandlers() {
            setTimeout(() => {
                const input = document.getElementById('report-photo-input');
                const zone = document.getElementById('report-photo-upload-zone');
                if (!input || !zone) return;
                zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
                zone.addEventListener('dragleave', () => zone.classList.remove('over'));
                zone.addEventListener('drop', (e) => {
                    e.preventDefault(); zone.classList.remove('over');
                    if (e.dataTransfer && e.dataTransfer.files) this.processPhotoFiles(e.dataTransfer.files);
                });
                input.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files.length) this.processPhotoFiles(e.target.files);
                    e.target.value = '';
                });
                this.updateGeoStudio();
            }, 100);
        },

        pickPhotos() {
            if (!this.activeLocation && !this.skipGeo) { toast.warning('Paste the Google Maps link first, or choose Skip geo-tagging.'); this.openGeoTagConfigModal(); return; }
            const input = document.getElementById('report-photo-input');
            if (input) input.click();
        },

        async processPhotoFiles(files) {
            this.applyActiveLocation();
            if (!this.activeLocation && !this.skipGeo) { toast.error('Paste the Google Maps link first, or choose Skip geo-tagging.'); this.openGeoTagConfigModal(); return; }

            const remaining = this.maxPhotos - this.reportPhotos.length;
            if (remaining <= 0) { toast.warning(`Maximum ${this.maxPhotos} photos allowed.`); return; }

            const list = Array.from(files).filter(f => f.type && f.type.startsWith('image/')).slice(0, remaining);
            if (!list.length) return;
            const procEl = document.getElementById('photo-processing');
            const procTxt = document.getElementById('photo-processing-text');
            if (procEl) procEl.classList.remove('hidden');

            const stamps = this.skipGeo ? list.map(() => null) : this.randomStamps(list.length);
            let failed = 0;
            for (let i = 0; i < list.length; i++) {
                const file = list[i];
                if (procTxt) procTxt.textContent = (this.skipGeo ? 'Preparing photo ' : 'Stamping photo ') + `${i + 1} of ${list.length}...`;
                try {
                    const blob = await this.applyGeoWatermark(file, stamps[i]);
                    const stamped = new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
                    const result = await window.Uploader.upload(stamped, { type: 'report_photo', folder: 'reports/' + this.currentEvent.id });
                    this.reportPhotos.push({ url: result.url, provider: result.provider, caption: '', existing: false, stamped: !this.skipGeo, stamp: stamps[i] ? stamps[i].toISOString() : null });
                    this.renderExistingPhotos();
                } catch (err) {
                    failed++;
                    console.error(err);
                }
            }
            if (procEl) procEl.classList.add('hidden');
            if (failed) toast.error(`${failed} photo(s) could not be read. Please use JPG or PNG photos.`);
            this.renderExistingPhotos();
            this.updatePhotoCounter();
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
        // 12. WATERMARK: creative "stamp card" overlay on a fixed 4:3 photo
        // ==========================================
        buildStampInfo(stamp) {
            const e = this.currentEvent || {};
            const cfg = this.AVENUE_CONFIG[e.is_dpp ? 'dpp' : e.avenue_slug] || { color: '#3B82F6', label: 'Project' };
            const loc = this.activeLocation;
            const d = stamp instanceof Date ? stamp : new Date();
            const lat = loc.latitude, lng = loc.longitude;
            return {
                eventName: e.event_name || 'Project',
                avenueLabel: (cfg.label || 'Project').toUpperCase(),
                color: cfg.color || '#3B82F6',
                dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                timeStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
                lat: `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'}`,
                lng: `${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? 'E' : 'W'}`,
                locName: this.activeLocationName || `${loc.city || 'Coimbatore'}, Tamil Nadu`,
                mapMeters: (480 / 2) * 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, 17),
                club: (window.SiteConfig && window.SiteConfig.val && window.SiteConfig.val('club_name')) || 'Rotaract Club of Coimbatore Unity'
            };
        },

        rrPath(ctx, x, y, w, h, r) {
            r = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
        },

        fitText(ctx, text, maxW) {
            let t = String(text || '');
            if (ctx.measureText(t).width <= maxW) return t;
            while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
            return t.trimEnd() + '…';
        },

        drawPinShape(ctx, x, y, r, color) {
            // teardrop pin whose tip sits at (x, y)
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x - r * 1.1, y - r * 1.15, x - r * 1.25, y - r * 2.7, x, y - r * 2.7);
            ctx.bezierCurveTo(x + r * 1.25, y - r * 2.7, x + r * 1.1, y - r * 1.15, x, y);
            ctx.closePath();
            ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = r * 0.8; ctx.shadowOffsetY = r * 0.25;
            ctx.fillStyle = color; ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = r * 0.22; ctx.strokeStyle = '#fff'; ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y - r * 1.6, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
            ctx.restore();
        },

        drawWatermarkOverlay(ctx, W, H, mapImg, info) {
            const s = W / 1600;
            const FONT = '"Poppins","Segoe UI",Arial,sans-serif';
            const m = 36 * s, cardH = 266 * s, cardW = W - m * 2, cardX = m, cardY = H - m - cardH;
            const color = info.color;

            // soft shade so the card always reads on bright photos
            const sh = ctx.createLinearGradient(0, H * 0.55, 0, H);
            sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
            ctx.fillStyle = sh; ctx.fillRect(0, H * 0.55, W, H * 0.45);

            // ---- top pills ----
            ctx.save();
            const topH = 46 * s;
            ctx.font = `700 ${18 * s}px ${FONT}`;
            ctx.lineWidth = 1.5 * s; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.textBaseline = 'middle';
            ctx.font = `600 ${17 * s}px ${FONT}`;
            const clubTxt = this.fitText(ctx, info.club, W * 0.45);
            const clubW = ctx.measureText(clubTxt).width + 40 * s;
            this.rrPath(ctx, W - m - clubW, m, clubW, topH, topH / 2);
            ctx.fillStyle = 'rgba(8,14,30,.78)'; ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e2e8f0'; ctx.fillText(clubTxt, W - m - clubW + 20 * s, m + topH / 2 + 1 * s);
            ctx.restore();

            // ---- glass card ----
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40 * s; ctx.shadowOffsetY = 12 * s;
            this.rrPath(ctx, cardX, cardY, cardW, cardH, 30 * s);
            const cg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
            cg.addColorStop(0, 'rgba(8,14,32,.90)'); cg.addColorStop(1, 'rgba(18,26,56,.84)');
            ctx.fillStyle = cg; ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 1.6 * s; ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.stroke();
            ctx.clip();
            // avenue colour spine + glow
            ctx.fillStyle = color; ctx.fillRect(cardX, cardY, 12 * s, cardH);
            const glow = ctx.createRadialGradient(cardX + cardW, cardY, 0, cardX + cardW, cardY, cardW * 0.5);
            glow.addColorStop(0, color + '55'); glow.addColorStop(1, color + '00');
            ctx.fillStyle = glow; ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.restore();

            // ---- map tile ----
            const ms = cardH - 44 * s, mx = cardX + 34 * s, my = cardY + 22 * s;
            ctx.save();
            this.rrPath(ctx, mx, my, ms, ms, 22 * s);
            ctx.fillStyle = '#e8eef5'; ctx.fill();
            ctx.clip();
            if (mapImg) ctx.drawImage(mapImg, mx, my, ms, ms);
            else { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2 * s; for (let i = 0; i <= ms; i += ms / 6) { ctx.beginPath(); ctx.moveTo(mx + i, my); ctx.lineTo(mx + i, my + ms); ctx.moveTo(mx, my + i); ctx.lineTo(mx + ms, my + i); ctx.stroke(); } }
            const vg = ctx.createRadialGradient(mx + ms / 2, my + ms / 2, ms * 0.25, mx + ms / 2, my + ms / 2, ms * 0.75);
            vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,14,30,.28)');
            ctx.fillStyle = vg; ctx.fillRect(mx, my, ms, ms);
            ctx.restore();
            // Google-style red pin with soft ground shadow
            ctx.save();
            ctx.beginPath(); ctx.ellipse(mx + ms / 2, my + ms / 2 + 2 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
            ctx.restore();
            this.drawPinShape(ctx, mx + ms / 2, my + ms / 2, 13 * s, '#EA4335');
            // white frame
            this.rrPath(ctx, mx, my, ms, ms, 22 * s);
            ctx.lineWidth = 4 * s; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            // compass button (top-right)
            ctx.save();
            const cx0 = mx + ms - 26 * s, cy0 = my + 26 * s;
            ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 2 * s;
            ctx.beginPath(); ctx.arc(cx0, cy0, 17 * s, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.beginPath(); ctx.moveTo(cx0, cy0 - 11 * s); ctx.lineTo(cx0 + 5.5 * s, cy0 + 2 * s); ctx.lineTo(cx0 - 5.5 * s, cy0 + 2 * s); ctx.closePath(); ctx.fillStyle = '#EA4335'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx0, cy0 + 11 * s); ctx.lineTo(cx0 + 5.5 * s, cy0 - 2 * s); ctx.lineTo(cx0 - 5.5 * s, cy0 - 2 * s); ctx.closePath(); ctx.fillStyle = '#9aa0a6'; ctx.fill();
            ctx.restore();
            // scale bar + attribution (bottom of the tile)
            if (info.mapMeters) {
                const nice = [10, 20, 50, 100, 200, 500];
                let want = info.mapMeters * 0.3, m1 = nice[0];
                nice.forEach(v => { if (v <= want) m1 = v; });
                const barW = ms * (m1 / info.mapMeters);
                ctx.save();
                const bx = mx + 14 * s, by = my + ms - 30 * s;
                this.rrPath(ctx, bx - 6 * s, by - 16 * s, barW + 12 * s + 40 * s, 24 * s, 7 * s);
                ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
                ctx.strokeStyle = '#3c4043'; ctx.lineWidth = 2 * s; ctx.lineCap = 'butt';
                ctx.beginPath(); ctx.moveTo(bx, by - 8 * s); ctx.lineTo(bx, by); ctx.lineTo(bx + barW, by); ctx.lineTo(bx + barW, by - 8 * s); ctx.stroke();
                ctx.fillStyle = '#3c4043'; ctx.font = `700 ${11 * s}px ${FONT}`; ctx.textAlign = 'start'; ctx.textBaseline = 'middle';
                ctx.fillText(m1 + ' m', bx + barW + 6 * s, by - 5 * s);
                ctx.restore();
            }
            ctx.save();
            ctx.font = `600 ${8.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(60,64,67,.85)'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
            ctx.fillText('\u00A9 OpenStreetMap \u00A9 CARTO', mx + ms - 8 * s, my + ms - 5 * s);
            ctx.restore();

            // ---- right column ----
            const x0 = mx + ms + 36 * s, xR = cardX + cardW - 30 * s, rw = xR - x0;
            ctx.textAlign = 'start'; ctx.textBaseline = 'middle';
            let y = cardY + 22 * s;

            // avenue chip + verified
            ctx.font = `800 ${16 * s}px ${FONT}`;
            const chipTxt = info.avenueLabel;
            const chipW = ctx.measureText(chipTxt).width + 36 * s, chipH = 34 * s;
            this.rrPath(ctx, x0, y, chipW, chipH, chipH / 2); ctx.fillStyle = color; ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText(chipTxt, x0 + 18 * s, y + chipH / 2 + 1 * s);
            const vTxt = 'LOCATION VERIFIED';
            ctx.font = `800 ${14 * s}px ${FONT}`;
            const vW = ctx.measureText(vTxt).width + 56 * s;
            this.rrPath(ctx, xR - vW, y, vW, chipH, chipH / 2);
            ctx.fillStyle = 'rgba(34,197,94,.16)'; ctx.fill(); ctx.lineWidth = 1.5 * s; ctx.strokeStyle = '#22c55e'; ctx.stroke();
            ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(xR - vW + 16 * s, y + chipH / 2); ctx.lineTo(xR - vW + 22 * s, y + chipH / 2 + 6 * s); ctx.lineTo(xR - vW + 32 * s, y + chipH / 2 - 6 * s); ctx.stroke();
            ctx.fillStyle = '#86efac'; ctx.fillText(vTxt, xR - vW + 42 * s, y + chipH / 2 + 1 * s);
            y += chipH + 12 * s;

            // event name
            ctx.font = `800 ${46 * s}px ${FONT}`; ctx.fillStyle = '#ffffff';
            ctx.fillText(this.fitText(ctx, info.eventName, rw), x0, y + 26 * s);
            y += 56 * s;

            // location name
            this.drawMapPinIcon(ctx, x0 + 12 * s, y + 14 * s, 26 * s, '#4ADE80');
            ctx.font = `600 ${27 * s}px ${FONT}`; ctx.fillStyle = '#cbd5e1';
            ctx.fillText(this.fitText(ctx, info.locName, rw - 36 * s), x0 + 34 * s, y + 15 * s);

            // four info tiles
            const gap = 14 * s, th = 58 * s, ty = cardY + cardH - 22 * s - th, tw = (rw - gap * 3) / 4;
            const tiles = [
                ['DATE', info.dateStr, '#ffffff'],
                ['TIME', info.timeStr, '#fbbf24'],
                ['LATITUDE', info.lat, '#4ade80'],
                ['LONGITUDE', info.lng, '#4ade80']
            ];
            tiles.forEach((t, i) => {
                const tx = x0 + i * (tw + gap);
                this.rrPath(ctx, tx, ty, tw, th, 15 * s);
                ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
                ctx.lineWidth = 1.2 * s; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.stroke();
                ctx.font = `800 ${12 * s}px ${FONT}`; ctx.fillStyle = '#94a3b8';
                ctx.fillText(t[0], tx + 14 * s, ty + 15 * s);
                ctx.font = `800 ${(i > 1 ? 21 : 22) * s}px ${i > 1 ? 'Consolas,"Courier New",monospace' : FONT}`; ctx.fillStyle = t[2];
                ctx.fillText(this.fitText(ctx, t[1], tw - 24 * s), tx + 14 * s, ty + 39 * s);
            });
            ctx.textBaseline = 'alphabetic';
        },

        async applyGeoWatermark(file, stamp) {
            const loc = this.activeLocation;
            if (!loc && !this.skipGeo) throw new Error('No location configured');
            const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
            const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });

            // Every photo becomes the same 4:3 frame (cover crop) so the report grid is always even
            const TW = 1600, TH = 1200;
            const canvas = document.createElement('canvas'); canvas.width = TW; canvas.height = TH;
            const ctx = canvas.getContext('2d');
            const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
            if (this.skipGeo) {
                // Upload as-is: whole picture fitted into the 4:3 frame over a soft blurred copy, no stamp
                const cover = Math.max(TW / iw, TH / ih);
                ctx.save(); ctx.filter = 'blur(28px) brightness(.8)';
                ctx.drawImage(img, (TW - iw * cover) / 2, (TH - ih * cover) / 2, iw * cover, ih * cover);
                ctx.restore();
                const fit = Math.min(TW / iw, TH / ih);
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, (TW - iw * fit) / 2, (TH - ih * fit) / 2, iw * fit, ih * fit);
                return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.92));
            }
            const scale = Math.max(TW / iw, TH / ih);
            const sw = TW / scale, sh = TH / scale;
            const sx = (iw - sw) / 2, sy = (ih - sh) * 0.4; // keep faces: crop a little more from the bottom
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);

            let map = null;
            try { map = await this.buildMapCanvas(loc.latitude, loc.longitude, 480, 17); } catch (e) { /* offline map: grid fallback */ }
            try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('800 40px Poppins'), new Promise(r => setTimeout(r, 1200))]); } catch (e) { /* font optional */ }
            this.drawWatermarkOverlay(ctx, TW, TH, map, this.buildStampInfo(stamp));

            return await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.9);
            });
        },

        // ---- photo slot grid (always 4:3 slots, filled in order) ----
        renderExistingPhotos() {
            const grid = document.getElementById('report-photos-grid');
            if (!grid) return;
            const has = !!this.activeLocation || !!this.skipGeo;
            const slots = [];
            const total = this.maxPhotos;
            for (let i = 0; i < total; i++) {
                const p = this.reportPhotos[i];
                if (p) {
                    slots.push(`
                        <div class="geo-slot" onclick="if(!event.target.closest('.geo-tools'))this.classList.toggle('open')">
                            <img src="${this.esc(p.url)}" alt="Photo ${i + 1}" loading="lazy">
                            <span class="geo-num">${i + 1}</span>
                            ${p.stamped === false ? '<span class="geo-tagpill">Original</span>' : ''}
                            <div class="geo-tools" onclick="event.stopPropagation()">
                                <div class="geo-btns">
                                    <button type="button" title="Move earlier" onclick="Reports.movePhoto(${i},-1)" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-left"></i></button>
                                    <button type="button" title="Move later" onclick="Reports.movePhoto(${i},1)" ${i === this.reportPhotos.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-right"></i></button>
                                    <button type="button" class="del" title="Remove" onclick="Reports.removePhoto(${i})"><i class="fa-solid fa-trash"></i></button>
                                </div>
                                <input type="text" class="geo-cap" placeholder="Add a caption..." value="${this.esc(p.caption || '')}" onchange="Reports.updatePhotoCaption(${i}, this.value)">
                            </div>
                        </div>`);
                } else {
                    slots.push(`
                        <div class="geo-slot empty ${has ? '' : 'locked'}" onclick="Reports.pickPhotos()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Reports.pickPhotos()}">
                            <div><i class="fa-solid fa-plus"></i><b>Photo ${i + 1}</b><small>${i < this.minPhotos ? 'Required' : 'Optional'}</small></div>
                        </div>`);
                }
            }
            grid.innerHTML = slots.join('');
        },

        movePhoto(i, dir) {
            const j = i + dir;
            if (j < 0 || j >= this.reportPhotos.length) return;
            const t = this.reportPhotos[i]; this.reportPhotos[i] = this.reportPhotos[j]; this.reportPhotos[j] = t;
            this.renderExistingPhotos();
        },
        updatePhotoCaption(i, caption) { if (this.reportPhotos[i]) this.reportPhotos[i].caption = caption; },
        removePhoto(i) { this.reportPhotos.splice(i, 1); this.renderExistingPhotos(); this.updatePhotoCounter(); },
        updatePhotoCounter() {
            const n = this.reportPhotos.length;
            const badge = document.getElementById('photo-count-badge');
            if (badge) badge.textContent = `${n}/${this.maxPhotos}`;
            const fill = document.getElementById('geo-bar-fill');
            if (fill) fill.style.width = Math.min(100, n / this.maxPhotos * 100) + '%';
            const txt = document.getElementById('geo-bar-text');
            if (txt) { const ok = n >= this.minPhotos; txt.textContent = ok ? 'Minimum met' : `${this.minPhotos - n} more needed`; txt.style.color = ok ? '#10b981' : '#f59e0b'; }
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
