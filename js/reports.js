/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - REPORTS MODULE
   Event Reports | Monthly Reports | DPP Reports | DOCX Generation
   Uses Supabase Edge Functions for professional document creation
   ============================================================ */

const Reports = {
    // ============================================================
    // CONFIGURATION
    // ============================================================
    edgeFunctionUrl: 'https://dledwtepuvzzztfypbgn.supabase.co/functions/v1/generate-docx',
    initialized: false,

    avenueLabels: {
        'club_service': 'Club Service',
        'community_service': 'Community Service',
        'professional_service': 'Professional Service',
        'international_service': 'International Service',
        'dpp': 'District Priority Projects'
    },

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
    },

    bindEvents() {
        // Report filter changes
        const filterMonth = document.getElementById('reportMonth');
        const filterAvenue = document.getElementById('reportFilterAvenue');

        if (filterMonth) {
            filterMonth.addEventListener('change', () => this.filterReports());
        }
        if (filterAvenue) {
            filterAvenue.addEventListener('change', () => this.filterReports());
        }
    },

    filterReports() {
        // Trigger admin panel to reload reports with filters
        if (typeof AdminPanel !== 'undefined') {
            AdminPanel.loadReports();
        }
    },

    // ============================================================
    // DOWNLOAD SINGLE EVENT REPORT
    // ============================================================
    async downloadEventReport(eventId) {
        const loader = this.showLoader('Generating event report...');

        try {
            // Fetch event with photos
            const { data: event, error: eventErr } = await supabaseAdmin
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (eventErr) throw eventErr;
            if (!event) throw new Error('Event not found');

            const { data: photos } = await supabaseAdmin
                .from('event_photos')
                .select('*')
                .eq('event_id', eventId)
                .order('sort_order');

            // Fetch site settings for branding
            const settings = await this.getSettings();

            // Determine if DPP report
            const isDPP = event.is_dpp || event.avenue === 'dpp';

            // Build payload for edge function
            const payload = {
                type: isDPP ? 'dpp_event_report' : 'event_report',
                event: {
                    ...event,
                    photos: photos || []
                },
                settings
            };

            // Call edge function
            const docxBlob = await this.callEdgeFunction(payload);

            // Download file
            const filename = `${this.sanitizeFilename(event.event_name)}_Report.docx`;
            this.downloadBlob(docxBlob, filename);

            this.hideLoader(loader);
            this.toast('Report downloaded successfully', 'success');

            if (typeof App !== 'undefined') {
                App.logActivity('report_downloaded', {
                    event_id: eventId,
                    event_name: event.event_name
                });
            }
        } catch (err) {
            console.error('Download event report error:', err);
            this.hideLoader(loader);
            this.toast('Failed to generate report: ' + (err.message || 'Unknown error'), 'error');
        }
    },

    // ============================================================
    // DOWNLOAD MONTHLY REPORT (Combined - All Avenues + DPP)
    // ============================================================
    async downloadMonthlyReport(month, type = 'all') {
        if (!month) {
            this.toast('Please select a month', 'warning');
            return;
        }

        const loader = this.showLoader(`Generating ${type === 'dpp' ? 'District Priority Projects' : 'monthly'} report...`);

        try {
            // Calculate month range
            const [year, monthNum] = month.split('-');
            const startDate = `${year}-${monthNum}-01`;
            const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
            const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

            // Build query
            let query = supabaseAdmin
                .from('events')
                .select('*')
                .gte('event_date', startDate)
                .lte('event_date', endDate)
                .eq('is_approved', true)
                .eq('report_submitted', true)
                .order('event_date', { ascending: true });

            // Apply avenue filter
            if (type !== 'all' && type !== 'dpp') {
                query = query.eq('avenue', type);
            } else if (type === 'dpp') {
                query = query.eq('avenue', 'dpp');
            }

            const { data: events, error } = await query;
            if (error) throw error;

            if (!events || events.length === 0) {
                this.hideLoader(loader);
                this.toast('No approved reports found for the selected period', 'warning');
                return;
            }

            // Fetch photos for all events
            const eventIds = events.map(e => e.id);
            const { data: allPhotos } = await supabaseAdmin
                .from('event_photos')
                .select('*')
                .in('event_id', eventIds)
                .order('sort_order');

            // Attach photos to each event
            const eventsWithPhotos = events.map(event => ({
                ...event,
                photos: (allPhotos || []).filter(p => p.event_id === event.id)
            }));

            // Fetch board leadership info for front page
            const leadership = await this.getMonthlyReportLeadership();

            // Fetch settings
            const settings = await this.getSettings();

            // Format month for display
            const monthDisplay = new Date(startDate).toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric'
            });

            // Determine report type
            let reportType, reportTitle;
            if (type === 'dpp') {
                reportType = 'dpp_monthly_report';
                reportTitle = `District Priority Projects Monthly Report - ${monthDisplay}`;
            } else if (type === 'all') {
                reportType = 'monthly_report_combined';
                reportTitle = `Monthly Report - ${monthDisplay}`;
            } else {
                reportType = 'monthly_report_avenue';
                reportTitle = `${this.avenueLabels[type]} Monthly Report - ${monthDisplay}`;
            }

            // Build payload
            const payload = {
                type: reportType,
                events: eventsWithPhotos,
                month: monthDisplay,
                month_year: month,
                avenue: type,
                report_title: reportTitle,
                leadership,
                settings
            };

            // Generate DOCX
            const docxBlob = await this.callEdgeFunction(payload);

            // Download
            const filename = `${this.sanitizeFilename(reportTitle)}.docx`;
            this.downloadBlob(docxBlob, filename);

            this.hideLoader(loader);
            this.toast(`Monthly report generated with ${events.length} project${events.length > 1 ? 's' : ''}`, 'success');

            if (typeof App !== 'undefined') {
                App.logActivity('monthly_report_downloaded', {
                    month,
                    type,
                    event_count: events.length
                });
            }

            // Send to members if approved
            if (typeof Mail !== 'undefined' && Auth.canApproveReports()) {
                setTimeout(() => {
                    this.confirmSendMonthlyReportToMembers(monthDisplay, docxBlob, filename);
                }, 1000);
            }
        } catch (err) {
            console.error('Monthly report error:', err);
            this.hideLoader(loader);
            this.toast('Failed to generate monthly report: ' + (err.message || 'Unknown error'), 'error');
        }
    },

    confirmSendMonthlyReportToMembers(monthDisplay, docxBlob, filename) {
        if (typeof App === 'undefined' || !App.confirm) return;

        App.confirm(
            `Do you want to send this monthly report (${monthDisplay}) to all members via email?`,
            async () => {
                try {
                    if (typeof Mail !== 'undefined' && Mail.sendMonthlyReportEmail) {
                        await Mail.sendMonthlyReportEmail(monthDisplay, filename);
                        this.toast('Monthly report email queued for members', 'success');
                    }
                } catch (err) {
                    console.error('Send monthly report email error:', err);
                    this.toast('Failed to send email', 'error');
                }
            }
        );
    },

    // ============================================================
    // DOWNLOAD DPP MONTHLY REPORT (Separate)
    // ============================================================
    async downloadDPPMonthlyReport(month) {
        return this.downloadMonthlyReport(month, 'dpp');
    },

    // ============================================================
    // DOWNLOAD AVENUE-WISE MONTHLY REPORT
    // ============================================================
    async downloadAvenueMonthlyReport(month, avenue) {
        return this.downloadMonthlyReport(month, avenue);
    },

    // ============================================================
    // GET LEADERSHIP INFO FOR MONTHLY REPORT FRONT PAGE
    // ============================================================
    async getMonthlyReportLeadership() {
        try {
            const { data: users } = await supabaseAdmin
                .from('users')
                .select('full_name, portfolio, role')
                .in('role', [
                    'president',
                    'secretary_admin',
                    'secretary_comm',
                    'vice_president',
                    'ipp',
                    'dpp_chair'
                ])
                .eq('is_active', true);

            const leadership = {
                president: null,
                secretary_admin: null,
                secretary_comm: null,
                vice_president: null,
                ipp: null,
                dpp_chair: null
            };

            (users || []).forEach(u => {
                if (leadership[u.role] === null) {
                    leadership[u.role] = {
                        name: u.full_name,
                        portfolio: u.portfolio || this.getRoleTitle(u.role)
                    };
                }
            });

            return leadership;
        } catch (err) {
            console.error('Get leadership error:', err);
            return {};
        }
    },

    getRoleTitle(role) {
        const titles = {
            'president': 'President',
            'secretary_admin': 'Secretary - Administration',
            'secretary_comm': 'Secretary - Communication',
            'vice_president': 'Vice President',
            'ipp': 'Immediate Past President',
            'dpp_chair': 'District Priority Projects Chair'
        };
        return titles[role] || role;
    },

    // ============================================================
    // GET SITE SETTINGS FOR REPORT BRANDING
    // ============================================================
    async getSettings() {
        try {
            // Use cached settings if available
            if (typeof App !== 'undefined' && App.settings && Object.keys(App.settings).length > 0) {
                return this.buildSettingsObject(App.settings);
            }

            // Fetch fresh
            const { data } = await supabaseAdmin.from('site_settings').select('*');
            const settingsMap = {};
            (data || []).forEach(s => {
                settingsMap[s.setting_key] = s.setting_value;
            });

            return this.buildSettingsObject(settingsMap);
        } catch (err) {
            console.error('Get settings error:', err);
            return this.getDefaultSettings();
        }
    },

    buildSettingsObject(settingsMap) {
        return {
            club_name: settingsMap.club_name || 'Rotaract Club of Coimbatore Unity',
            parent_club: settingsMap.parent_club || 'Family of Rotary Club of Coimbatore East',
            club_id: settingsMap.club_id || '91594',
            charter_date: settingsMap.charter_date || '21.4.2014',
            district: settingsMap.district || 'Rotary International District 3206',
            district_region: settingsMap.district_region || 'Coimbatore | Pallakkad',
            club_email: settingsMap.club_email || 'rc.cbeunity@gmail.com',
            report_logo_strip: settingsMap.report_logo_strip || 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
            report_logo_strip_height: parseFloat(settingsMap.report_logo_strip_height) || 0.43,
            report_logo_strip_width: parseFloat(settingsMap.report_logo_strip_width) || 4.63,
            dpp_logo_strip: settingsMap.dpp_logo_strip || 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_dppAsset_1_2x-8_prlgp6.png',
            dpp_logo_strip_height: parseFloat(settingsMap.dpp_logo_strip_height) || 0.42,
            dpp_logo_strip_width: parseFloat(settingsMap.dpp_logo_strip_width) || 5.55
        };
    },

    getDefaultSettings() {
        return {
            club_name: 'Rotaract Club of Coimbatore Unity',
            parent_club: 'Family of Rotary Club of Coimbatore East',
            club_id: '91594',
            charter_date: '21.4.2014',
            district: 'Rotary International District 3206',
            district_region: 'Coimbatore | Pallakkad',
            report_logo_strip: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
            report_logo_strip_height: 0.43,
            report_logo_strip_width: 4.63,
            dpp_logo_strip: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_dppAsset_1_2x-8_prlgp6.png',
            dpp_logo_strip_height: 0.42,
            dpp_logo_strip_width: 5.55
        };
    },

    // ============================================================
    // CALL SUPABASE EDGE FUNCTION
    // ============================================================
    async callEdgeFunction(payload) {
        try {
            const response = await fetch(this.edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Edge function error:', errorText);
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get('content-type') || '';

            // Check if response is DOCX
            if (contentType.includes('application/vnd.openxmlformats') ||
                contentType.includes('application/octet-stream') ||
                contentType.includes('application/msword')) {
                return await response.blob();
            }

            // Handle JSON response with base64 content
            if (contentType.includes('application/json')) {
                const json = await response.json();
                if (json.error) throw new Error(json.error);
                if (json.data) {
                    // Base64 to Blob
                    return this.base64ToBlob(
                        json.data,
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    );
                }
                throw new Error('Invalid response format');
            }

            // Default: try as blob
            return await response.blob();
        } catch (err) {
            console.error('Edge function call error:', err);

            // Fallback: try client-side generation
            if (err.message && err.message.includes('Failed to fetch')) {
                this.toast('Server unavailable, generating simple report locally...', 'warning');
                return await this.generateFallbackDocx(payload);
            }

            throw err;
        }
    },

    // ============================================================
    // FALLBACK: CLIENT-SIDE SIMPLE DOCX GENERATION
    // ============================================================
    async generateFallbackDocx(payload) {
        // Simple HTML-based document that Word can open
        const html = this.buildFallbackHtml(payload);
        const blob = new Blob([html], { type: 'application/msword' });
        return blob;
    },

    buildFallbackHtml(payload) {
        const settings = payload.settings || {};
        let content = '';

        if (payload.type === 'event_report' || payload.type === 'dpp_event_report') {
            content = this.buildEventReportHtml(payload.event, settings, payload.type === 'dpp_event_report');
        } else if (payload.type.includes('monthly')) {
            content = this.buildMonthlyReportHtml(payload, settings);
        }

        return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>Report</title>
<style>
    @page { size: A4; margin: 1in; }
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
    .center { text-align: center; }
    .justified { text-align: justify; }
    .bold { font-weight: bold; }
    h1 { font-size: 20pt; margin: 12pt 0; }
    h2 { font-size: 14pt; margin: 10pt 0; }
    h3 { font-size: 12pt; margin: 8pt 0; }
    hr { border: none; border-top: 1pt solid #000; margin: 12pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
    td, th { padding: 6pt; border: 1pt solid #ccc; vertical-align: top; }
    .logo-strip { width: ${(settings.report_logo_strip_width || 4.63) * 72}pt; height: auto; }
    img { max-width: 100%; }
    .event-photo { width: 300pt; margin: 10pt 0; }
    .details-table td { border: none; padding: 3pt 6pt; }
    .front-page { page-break-after: always; text-align: center; padding: 100pt 0; }
    .footer-signatures { display: table; width: 100%; margin-top: 60pt; }
    .signature-cell { display: table-cell; text-align: center; width: 33%; }
</style>
</head>
<body>
${content}
</body>
</html>`;
    },

    buildEventReportHtml(event, settings, isDPP) {
        const logoStrip = isDPP ? settings.dpp_logo_strip : settings.report_logo_strip;
        const logoHeight = isDPP ? settings.dpp_logo_strip_height : settings.report_logo_strip_height;
        const logoWidth = isDPP ? settings.dpp_logo_strip_width : settings.report_logo_strip_width;

        const dateStr = new Date(event.event_date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        const timeStr = this.formatTime(event.event_time);
        const photosHtml = (event.photos || []).map(p =>
            `<img src="${p.photo_url}" class="event-photo" alt="Event photo">`
        ).join('<br>');

        return `
<div class="center">
    <img src="${logoStrip}" style="width:${logoWidth}in;height:${logoHeight}in" alt="Logo Strip">
</div>
<h1 class="center bold">${this.esc(settings.club_name)}</h1>
<h2 class="center">${this.esc(settings.parent_club)}</h2>
<p class="center">Club ID: ${this.esc(settings.club_id)} | Group ${this.esc(event.group_number || '1')} | ${this.esc(settings.district)}</p>
<hr>

<table class="details-table">
    <tr><td class="bold" style="width:30%">Event Name:</td><td>${this.esc(event.event_name)}</td></tr>
    <tr><td class="bold">Date:</td><td>${dateStr}</td></tr>
    <tr><td class="bold">Time:</td><td>${timeStr}${event.end_time ? ' - ' + this.formatTime(event.end_time) : ''}</td></tr>
    <tr><td class="bold">Venue:</td><td>${this.esc(event.venue || 'N/A')}</td></tr>
    <tr><td class="bold">Event Chair:</td><td>${this.esc(event.event_chair || 'N/A')}</td></tr>
    ${event.event_secretary ? `<tr><td class="bold">Event Secretary:</td><td>${this.esc(event.event_secretary)}</td></tr>` : ''}
    <tr><td class="bold">Avenue:</td><td>${this.avenueLabels[event.avenue] || event.avenue}</td></tr>
    ${isDPP && event.dpp_project_number ? `<tr><td class="bold">District Priority Projects Number:</td><td>${this.esc(event.dpp_project_number)}</td></tr>` : ''}
    ${isDPP && event.dpp_pillar ? `<tr><td class="bold">District Priority Projects Pillar:</td><td>${this.esc(event.dpp_pillar)}</td></tr>` : ''}
    ${isDPP && event.dpp_category ? `<tr><td class="bold">District Priority Projects Category:</td><td>${this.esc(event.dpp_category)}</td></tr>` : ''}
    ${event.proposed_by ? `<tr><td class="bold">Proposed By:</td><td>${this.esc(event.proposed_by)}</td></tr>` : ''}
    ${event.seconded_by ? `<tr><td class="bold">Seconded By:</td><td>${this.esc(event.seconded_by)}</td></tr>` : ''}
    ${event.collaboration_type ? `<tr><td class="bold">Collaboration:</td><td>${this.capitalize(event.collaboration_type)}${event.collaborator_name ? ' - ' + this.esc(event.collaborator_name) : ''}</td></tr>` : ''}
</table>

<hr>

<h3 class="center bold">REPORT</h3>
<p class="justified">${this.esc(event.report_text || 'No report content available.').replace(/\n/g, '<br>')}</p>

${photosHtml ? '<h3 class="center bold">ACTION PHOTOGRAPHS</h3>' + '<div class="center">' + photosHtml + '</div>' : ''}
`;
    },

    buildMonthlyReportHtml(payload, settings) {
        const { events, month, leadership, report_title } = payload;
        const logoStrip = settings.report_logo_strip;

        // Front page
        let html = `
<div class="front-page">
    <div class="center">
        <img src="${logoStrip}" style="width:${settings.report_logo_strip_width}in;height:${settings.report_logo_strip_height}in" alt="Logo Strip">
    </div>
    <h1 class="center bold" style="margin-top:40pt">${this.esc(settings.club_name)}</h1>
    <h2 class="center" style="margin-top:12pt">${this.esc(settings.parent_club)}</h2>
    <p class="center">Club ID: ${this.esc(settings.club_id)} | ${this.esc(settings.district)}</p>
    <hr>
    <h1 class="center bold" style="margin-top:80pt; font-size:24pt">MONTHLY REPORT</h1>
    <h2 class="center bold" style="margin-top:20pt">${this.esc(month)}</h2>

    <div class="footer-signatures" style="margin-top:200pt">
        <div class="signature-cell">
            <p class="bold">${this.esc(leadership.secretary_admin?.name || 'Secretary Administration')}</p>
            <p>Secretary - Administration</p>
        </div>
        <div class="signature-cell">
            <p class="bold">${this.esc(leadership.president?.name || 'President')}</p>
            <p>President</p>
        </div>
        <div class="signature-cell">
            <p class="bold">${this.esc(leadership.secretary_comm?.name || 'Secretary Communication')}</p>
            <p>Secretary - Communication</p>
        </div>
    </div>
</div>
`;

        // Events pages
        events.forEach((event, idx) => {
            html += `<div style="page-break-before:always">`;
            html += this.buildEventReportHtml(event, settings, event.is_dpp || event.avenue === 'dpp');
            html += `</div>`;
        });

        return html;
    },

    // ============================================================
    // UTILITY: BASE64 TO BLOB
    // ============================================================
    base64ToBlob(base64, mimeType) {
        try {
            const byteCharacters = atob(base64);
            const byteArrays = [];

            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                byteArrays.push(new Uint8Array(byteNumbers));
            }

            return new Blob(byteArrays, { type: mimeType });
        } catch (err) {
            console.error('Base64 decode error:', err);
            throw new Error('Failed to decode document data');
        }
    },

    // ============================================================
    // DOWNLOAD BLOB HELPER
    // ============================================================
    downloadBlob(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up after delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('Download error:', err);
            this.toast('Failed to download file', 'error');
        }
    },

    // ============================================================
    // LOADING OVERLAY
    // ============================================================
    showLoader(message = 'Processing...') {
        const existing = document.getElementById('reportLoader');
        if (existing) existing.remove();

        const loader = document.createElement('div');
        loader.id = 'reportLoader';
        loader.className = 'report-loader-overlay';
        loader.innerHTML = `
            <div class="report-loader-content">
                <div class="report-loader-spinner"></div>
                <p class="report-loader-message">${this.esc(message)}</p>
                <p class="report-loader-sub">This may take a moment...</p>
            </div>
        `;

        this.injectLoaderStyles();
        document.body.appendChild(loader);
        return loader;
    },

    hideLoader(loader) {
        if (loader && loader.parentNode) {
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader.parentNode) loader.remove();
            }, 300);
        }
    },

    injectLoaderStyles() {
        if (document.getElementById('reportLoaderStyles')) return;

        const style = document.createElement('style');
        style.id = 'reportLoaderStyles';
        style.textContent = `
            .report-loader-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                z-index: 9700;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
                transition: opacity 0.3s ease;
            }
            .report-loader-content {
                background: var(--bg-tertiary);
                padding: 3rem 2.5rem;
                border-radius: var(--radius-lg);
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                min-width: 320px;
                max-width: 90vw;
            }
            .report-loader-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid var(--border-color);
                border-top-color: var(--primary);
                border-radius: 50%;
                margin: 0 auto 1.5rem;
                animation: spin 0.8s linear infinite;
            }
            .report-loader-message {
                font-size: 1.05rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.4rem;
            }
            .report-loader-sub {
                font-size: 0.85rem;
                color: var(--text-muted);
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    },

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    formatTime(timeStr) {
        if (!timeStr) return '';
        try {
            const [h, m] = timeStr.split(':');
            const hour = parseInt(h, 10);
            if (isNaN(hour)) return timeStr;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${m} ${ampm}`;
        } catch {
            return timeStr;
        }
    },

    capitalize(str) {
        if (!str) return '';
        return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    },

    sanitizeFilename(name) {
        if (!name) return 'Report';
        return String(name)
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 100);
    },

    toast(message, type = 'info', duration = 3000) {
        if (typeof App !== 'undefined' && App.toast) {
            App.toast(message, type, duration);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
};

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof Reports !== 'undefined') Reports.init();
    }, 100);
});

// Global exposure
window.Reports = Reports;