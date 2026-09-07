/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - EVENTS MODULE
   Event Management | Calendar | Sharing | Avenue Filtering
   Full CRUD | Interactive UI
   ============================================================ */

const Events = {
    // ============================================================
    // CONFIGURATION
    // ============================================================
    currentFilter: 'all',
    currentEvents: [],
    upcomingEvents: [],
    completedEvents: [],
    initialized: false,

    avenueLabels: {
        'club_service': 'Club Service',
        'community_service': 'Community Service',
        'professional_service': 'Professional Service',
        'international_service': 'International Service',
        'dpp': 'District Priority Projects'
    },

    avenueIcons: {
        'club_service': 'users',
        'community_service': 'heart',
        'professional_service': 'briefcase',
        'international_service': 'globe',
        'dpp': 'star'
    },

    avenueColors: {
        'club_service': '#2563eb',
        'community_service': '#dc2626',
        'professional_service': '#9333ea',
        'international_service': '#0891b2',
        'dpp': '#d97706'
    },

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.bindEvents();
        this.loadUpcomingEvents();
        this.loadCompletedEvents('all');
    },

    bindEvents() {
        // Avenue filter tabs
        document.querySelectorAll('.avenue-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAvenueFilter(tab);
            });
        });

        // Event modal close
        const eventModal = document.getElementById('eventModal');
        const eventModalClose = document.getElementById('eventModalClose');

        if (eventModalClose) {
            eventModalClose.addEventListener('click', () => this.closeEventModal());
        }

        if (eventModal) {
            eventModal.addEventListener('click', (e) => {
                if (e.target === eventModal) this.closeEventModal();
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('eventModal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeEventModal();
                }
            }
        });
    },

    // ============================================================
    // AVENUE FILTER
    // ============================================================
    handleAvenueFilter(tab) {
        // Update active state
        document.querySelectorAll('.avenue-tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Load filtered events
        this.currentFilter = tab.dataset.avenue;
        this.loadCompletedEvents(this.currentFilter);
    },

    // ============================================================
    // LOAD UPCOMING EVENTS (Next 7 Days)
    // ============================================================
    async loadUpcomingEvents() {
        const grid = document.getElementById('upcomingEventsGrid');
        if (!grid) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];

            const { data, error } = await supabaseClient
                .from('events')
                .select('*')
                .gte('event_date', today)
                .lte('event_date', nextWeekStr)
                .eq('is_approved', true)
                .order('event_date', { ascending: true })
                .order('event_time', { ascending: true });

            if (error) throw error;

            this.upcomingEvents = data || [];

            if (!this.upcomingEvents.length) {
                grid.innerHTML = this.renderEmptyState(
                    'calendar',
                    'No upcoming projects in the next 7 days',
                    'Check back soon for new events!'
                );
            } else {
                grid.innerHTML = this.upcomingEvents
                    .map(event => this.renderEventCard(event, true))
                    .join('');
            }

            if (typeof feather !== 'undefined') feather.replace();
        } catch (err) {
            console.error('Load upcoming events error:', err);
            grid.innerHTML = this.renderEmptyState(
                'alert-circle',
                'Failed to load upcoming projects',
                'Please refresh the page to try again'
            );
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    // ============================================================
    // LOAD COMPLETED EVENTS BY AVENUE
    // ============================================================
    async loadCompletedEvents(avenue = 'all') {
        const grid = document.getElementById('completedEventsGrid');
        if (!grid) return;

        // Show loading state
        grid.innerHTML = this.renderLoadingState();

        try {
            const today = new Date().toISOString().split('T')[0];

            let query = supabaseClient
                .from('events')
                .select('*')
                .lt('event_date', today)
                .eq('is_approved', true)
                .order('event_date', { ascending: false })
                .limit(24);

            if (avenue && avenue !== 'all') {
                query = query.eq('avenue', avenue);
            }

            const { data, error } = await query;
            if (error) throw error;

            this.completedEvents = data || [];

            if (!this.completedEvents.length) {
                grid.innerHTML = this.renderEmptyState(
                    'inbox',
                    'No completed projects in this avenue yet',
                    avenue !== 'all'
                        ? `No projects found for ${this.avenueLabels[avenue]}`
                        : 'Completed projects will appear here'
                );
            } else {
                grid.innerHTML = this.completedEvents
                    .map(event => this.renderEventCard(event, false))
                    .join('');
            }

            if (typeof feather !== 'undefined') feather.replace();
        } catch (err) {
            console.error('Load completed events error:', err);
            grid.innerHTML = this.renderEmptyState(
                'alert-circle',
                'Failed to load projects',
                'Please refresh the page to try again'
            );
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    // ============================================================
    // RENDER EVENT CARD
    // ============================================================
    renderEventCard(event, upcoming = false) {
        const dateObj = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
        const dateStr = dateObj.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = this.formatTime(event.event_time);
        const avenueLabel = this.avenueLabels[event.avenue] || event.avenue;
        const avenueIcon = this.avenueIcons[event.avenue] || 'tag';
        const daysAway = upcoming ? this.getDaysAway(event.event_date) : null;

        return `
            <article class="event-card glass-card" onclick="Events.showEventDetails('${event.id}')" role="button" tabindex="0"
                     onkeydown="if(event.key==='Enter'||event.key===' ')Events.showEventDetails('${event.id}')">
                ${event.poster_url
                    ? `<img src="${this.esc(event.poster_url)}" alt="${this.esc(event.event_name)} Poster" class="event-poster" loading="lazy" onerror="this.style.display='none'">`
                    : `<div class="event-poster-placeholder"><i data-feather="image"></i></div>`
                }
                <div class="event-info">
                    <span class="event-avenue-badge">
                        <i data-feather="${avenueIcon}"></i>${avenueLabel}
                    </span>
                    ${daysAway !== null ? `
                        <span class="event-days-badge">${this.formatDaysAway(daysAway)}</span>
                    ` : ''}
                    <h3 class="event-title">${this.esc(event.event_name)}</h3>
                    <div class="event-meta">
                        <div class="event-meta-item">
                            <i data-feather="calendar"></i>
                            <span>${dateStr}</span>
                        </div>
                        <div class="event-meta-item">
                            <i data-feather="clock"></i>
                            <span>${timeStr}${event.end_time ? ' - ' + this.formatTime(event.end_time) : ''}</span>
                        </div>
                        ${event.venue ? `
                        <div class="event-meta-item">
                            <i data-feather="map-pin"></i>
                            <span>${this.esc(event.venue)}</span>
                        </div>` : ''}
                        ${event.event_chair ? `
                        <div class="event-meta-item">
                            <i data-feather="user"></i>
                            <span>${this.esc(event.event_chair)}</span>
                        </div>` : ''}
                    </div>
                    ${event.description ? `
                        <p class="event-description">${this.esc(event.description)}</p>
                    ` : ''}
                    <div class="event-actions">
                        <button class="btn btn-primary btn-sm"
                                onclick="event.stopPropagation(); Events.showEventDetails('${event.id}')"
                                aria-label="View details">
                            <i data-feather="eye"></i>Details
                        </button>
                        ${upcoming ? `
                        <button class="btn btn-outline btn-sm"
                                onclick="event.stopPropagation(); Events.addToCalendar('${event.id}')"
                                aria-label="Add to calendar">
                            <i data-feather="plus"></i>Calendar
                        </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm"
                                onclick="event.stopPropagation(); Events.shareEvent('${event.id}')"
                                aria-label="Share event">
                            <i data-feather="share-2"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    },

    // ============================================================
    // SHOW EVENT DETAILS MODAL
    // ============================================================
    async showEventDetails(eventId) {
        const modal = document.getElementById('eventModal');
        const body = document.getElementById('eventModalBody');
        if (!modal || !body) return;

        // Show modal with loading
        body.innerHTML = this.renderLoadingState();
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        try {
            const { data: event, error } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            if (!event) throw new Error('Event not found');

            // Load photos
            const { data: photos } = await supabaseClient
                .from('event_photos')
                .select('*')
                .eq('event_id', eventId)
                .order('sort_order');

            const dateObj = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
            const dateStr = dateObj.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            body.innerHTML = this.renderEventDetailsContent(event, photos || [], dateStr);

            if (typeof feather !== 'undefined') feather.replace();
        } catch (err) {
            console.error('Show event error:', err);
            body.innerHTML = this.renderEmptyState(
                'alert-circle',
                'Failed to load event details',
                'Please try again later'
            );
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    renderEventDetailsContent(event, photos, dateStr) {
        const timeDisplay = this.formatTime(event.event_time) +
            (event.end_time ? ' - ' + this.formatTime(event.end_time) : '');

        return `
            ${event.poster_url ? `
                <img src="${this.esc(event.poster_url)}"
                     alt="${this.esc(event.event_name)}"
                     class="event-modal-poster"
                     onerror="this.style.display='none'">
            ` : ''}

            <span class="event-avenue-badge">
                <i data-feather="${this.avenueIcons[event.avenue] || 'tag'}"></i>
                ${this.avenueLabels[event.avenue] || event.avenue}
            </span>

            <h2 class="event-modal-title">${this.esc(event.event_name)}</h2>

            <div class="event-modal-meta">
                <div class="event-modal-meta-item">
                    <i data-feather="calendar"></i>
                    <div>
                        <strong>Date</strong>
                        <span>${dateStr}</span>
                    </div>
                </div>
                <div class="event-modal-meta-item">
                    <i data-feather="clock"></i>
                    <div>
                        <strong>Time</strong>
                        <span>${timeDisplay}</span>
                    </div>
                </div>
                ${event.venue ? `
                <div class="event-modal-meta-item">
                    <i data-feather="map-pin"></i>
                    <div>
                        <strong>Venue</strong>
                        <span>${this.esc(event.venue)}</span>
                    </div>
                </div>` : ''}
                ${event.event_chair ? `
                <div class="event-modal-meta-item">
                    <i data-feather="user"></i>
                    <div>
                        <strong>Event Chair</strong>
                        <span>${this.esc(event.event_chair)}</span>
                    </div>
                </div>` : ''}
                ${event.event_secretary ? `
                <div class="event-modal-meta-item">
                    <i data-feather="user-check"></i>
                    <div>
                        <strong>Event Secretary</strong>
                        <span>${this.esc(event.event_secretary)}</span>
                    </div>
                </div>` : ''}
                ${event.proposed_by ? `
                <div class="event-modal-meta-item">
                    <i data-feather="user-plus"></i>
                    <div>
                        <strong>Proposed By</strong>
                        <span>${this.esc(event.proposed_by)}</span>
                    </div>
                </div>` : ''}
                ${event.seconded_by ? `
                <div class="event-modal-meta-item">
                    <i data-feather="user-plus"></i>
                    <div>
                        <strong>Seconded By</strong>
                        <span>${this.esc(event.seconded_by)}</span>
                    </div>
                </div>` : ''}
                ${event.collaboration_type ? `
                <div class="event-modal-meta-item">
                    <i data-feather="link"></i>
                    <div>
                        <strong>Collaboration</strong>
                        <span>${this.capitalize(event.collaboration_type)}${event.collaborator_name ? ' - ' + this.esc(event.collaborator_name) : ''}</span>
                    </div>
                </div>` : ''}
                <div class="event-modal-meta-item">
                    <i data-feather="users"></i>
                    <div>
                        <strong>Group Number</strong>
                        <span>Group ${this.esc(event.group_number || '1')}</span>
                    </div>
                </div>
                ${event.is_dpp ? `
                <div class="event-modal-meta-item">
                    <i data-feather="star"></i>
                    <div>
                        <strong>District Priority Projects Number</strong>
                        <span>${this.esc(event.dpp_project_number || 'N/A')}</span>
                    </div>
                </div>
                <div class="event-modal-meta-item">
                    <i data-feather="award"></i>
                    <div>
                        <strong>District Priority Projects Pillar</strong>
                        <span>${this.esc(event.dpp_pillar || 'N/A')}</span>
                    </div>
                </div>
                <div class="event-modal-meta-item">
                    <i data-feather="tag"></i>
                    <div>
                        <strong>District Priority Projects Category</strong>
                        <span>${this.esc(event.dpp_category || 'N/A')}</span>
                    </div>
                </div>` : ''}
            </div>

            ${event.description ? `
                <div class="event-modal-section">
                    <h4 class="event-modal-section-title">About the Project</h4>
                    <p class="event-modal-description">${this.esc(event.description)}</p>
                </div>
            ` : ''}

            ${event.report_text ? `
                <div class="event-modal-section">
                    <h4 class="event-modal-section-title">Project Report</h4>
                    <p class="event-modal-description">${this.esc(event.report_text)}</p>
                </div>
            ` : ''}

            <div class="event-modal-actions">
                ${new Date(event.event_date) >= new Date() ? `
                    <button class="btn btn-primary" onclick="Events.addToCalendar('${event.id}')">
                        <i data-feather="calendar"></i>Add to Calendar
                    </button>
                ` : ''}
                <button class="btn btn-outline" onclick="Events.shareEvent('${event.id}')">
                    <i data-feather="share-2"></i>Share
                </button>
                ${event.venue ? `
                    <button class="btn btn-secondary" onclick="Events.openDirections('${this.esc(event.venue)}')">
                        <i data-feather="navigation"></i>Directions
                    </button>
                ` : ''}
            </div>

            ${photos && photos.length > 0 ? `
                <div class="event-modal-section">
                    <h4 class="event-modal-section-title">
                        <i data-feather="image"></i>
                        Event Photographs (${photos.length})
                    </h4>
                    <div class="event-modal-photos">
                        ${photos.map((p, idx) => `
                            <img src="${this.esc(p.photo_url)}"
                                 alt="Event photo ${idx + 1}"
                                 loading="lazy"
                                 onclick="Events.viewPhotoFullscreen('${this.esc(p.photo_url)}')"
                                 onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    },

    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    // ============================================================
    // ADD TO CALENDAR (Multiple formats)
    // ============================================================
    async addToCalendar(eventId) {
        try {
            const { data: event, error } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error || !event) throw new Error('Event not found');

            // Show calendar selection modal
            this.showCalendarOptions(event);
        } catch (err) {
            console.error('Add to calendar error:', err);
            this.toast('Failed to load event details', 'error');
        }
    },

    showCalendarOptions(event) {
        // Remove existing dropdown if any
        const existing = document.getElementById('calendarOptionsMenu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'calendarOptionsMenu';
        menu.className = 'calendar-options-menu';
        menu.innerHTML = `
            <div class="calendar-options-content glass-card">
                <div class="calendar-options-header">
                    <h3><i data-feather="calendar"></i>Add to Calendar</h3>
                    <button class="calendar-options-close" onclick="document.getElementById('calendarOptionsMenu').remove()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="calendar-options-list">
                    <button class="calendar-option-btn" onclick="Events.downloadICS('${event.id}'); document.getElementById('calendarOptionsMenu').remove();">
                        <i data-feather="download"></i>
                        <div>
                            <strong>Apple / Outlook / iCal</strong>
                            <span>Download .ics file</span>
                        </div>
                    </button>
                    <button class="calendar-option-btn" onclick="Events.openGoogleCalendar('${event.id}'); document.getElementById('calendarOptionsMenu').remove();">
                        <i data-feather="external-link"></i>
                        <div>
                            <strong>Google Calendar</strong>
                            <span>Add to your Google Calendar</span>
                        </div>
                    </button>
                    <button class="calendar-option-btn" onclick="Events.openOutlookCalendar('${event.id}'); document.getElementById('calendarOptionsMenu').remove();">
                        <i data-feather="external-link"></i>
                        <div>
                            <strong>Outlook Web</strong>
                            <span>Add to Outlook.com</span>
                        </div>
                    </button>
                    <button class="calendar-option-btn" onclick="Events.openYahooCalendar('${event.id}'); document.getElementById('calendarOptionsMenu').remove();">
                        <i data-feather="external-link"></i>
                        <div>
                            <strong>Yahoo Calendar</strong>
                            <span>Add to Yahoo Calendar</span>
                        </div>
                    </button>
                </div>
            </div>
        `;

        // Add styles inline for calendar menu
        this.injectCalendarMenuStyles();

        document.body.appendChild(menu);
        if (typeof feather !== 'undefined') feather.replace();

        // Close on outside click
        setTimeout(() => {
            menu.addEventListener('click', (e) => {
                if (e.target === menu) menu.remove();
            });
        }, 100);
    },

    injectCalendarMenuStyles() {
        if (document.getElementById('calendarMenuStyles')) return;

        const style = document.createElement('style');
        style.id = 'calendarMenuStyles';
        style.textContent = `
            .calendar-options-menu {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(6px);
                z-index: 9500;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: fadeIn 0.3s ease;
            }
            .calendar-options-content {
                background: var(--bg-tertiary);
                max-width: 420px;
                width: 100%;
                border-radius: var(--radius-lg);
                overflow: hidden;
                animation: modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .calendar-options-header {
                padding: 1.25rem 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: var(--gradient-blue);
                color: white;
            }
            .calendar-options-header h3 {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0;
                font-size: 1.1rem;
            }
            .calendar-options-header h3 i {
                width: 20px;
                height: 20px;
            }
            .calendar-options-close {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                cursor: pointer;
                transition: all 0.2s;
            }
            .calendar-options-close:hover {
                background: var(--danger);
                transform: rotate(90deg);
            }
            .calendar-options-close i {
                width: 16px;
                height: 16px;
            }
            .calendar-options-list {
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .calendar-option-btn {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: var(--bg-glass);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                color: var(--text-primary);
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
            }
            .calendar-option-btn:hover {
                background: rgba(26, 86, 219, 0.08);
                border-color: var(--primary);
                transform: translateX(4px);
            }
            .calendar-option-btn i {
                width: 22px;
                height: 22px;
                color: var(--primary);
                flex-shrink: 0;
            }
            .calendar-option-btn > div {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .calendar-option-btn strong {
                font-size: 0.95rem;
                font-weight: 600;
            }
            .calendar-option-btn span {
                font-size: 0.8rem;
                color: var(--text-muted);
            }
        `;
        document.head.appendChild(style);
    },

    // Download .ics file (Apple/Outlook/iCal)
    async downloadICS(eventId) {
        try {
            const { data: event } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (!event) return;

            const startDate = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
            const endDate = event.end_time
                ? new Date(event.event_date + 'T' + event.end_time)
                : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const formatICS = (d) => {
                return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const escapeICS = (str) => {
                if (!str) return '';
                return String(str)
                    .replace(/\\/g, '\\\\')
                    .replace(/;/g, '\\;')
                    .replace(/,/g, '\\,')
                    .replace(/\n/g, '\\n');
            };

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Rotaract Club of Coimbatore Unity//Event//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'BEGIN:VEVENT',
                `UID:${event.id}@rotaractunity`,
                `DTSTAMP:${formatICS(new Date())}`,
                `DTSTART:${formatICS(startDate)}`,
                `DTEND:${formatICS(endDate)}`,
                `SUMMARY:${escapeICS(event.event_name)}`,
                `DESCRIPTION:${escapeICS(event.description || '')}`,
                `LOCATION:${escapeICS(event.venue || '')}`,
                `ORGANIZER;CN=Rotaract Club of Coimbatore Unity:mailto:rc.cbeunity@gmail.com`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                `DESCRIPTION:${escapeICS(event.event_name)}`,
                'TRIGGER:-PT1H',
                'END:VALARM',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event.event_name.replace(/[^a-z0-9]/gi, '_')}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.toast('Calendar file downloaded successfully', 'success');
        } catch (err) {
            console.error('Download ICS error:', err);
            this.toast('Failed to generate calendar file', 'error');
        }
    },

    // Google Calendar link
    async openGoogleCalendar(eventId) {
        try {
            const { data: event } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (!event) return;

            const startDate = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
            const endDate = event.end_time
                ? new Date(event.event_date + 'T' + event.end_time)
                : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const formatGoogle = (d) => {
                return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: event.event_name,
                dates: `${formatGoogle(startDate)}/${formatGoogle(endDate)}`,
                details: event.description || '',
                location: event.venue || '',
                sf: 'true',
                output: 'xml'
            });

            const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
            window.open(url, '_blank', 'noopener,noreferrer');

            this.toast('Opening Google Calendar...', 'info');
        } catch (err) {
            console.error('Google Calendar error:', err);
            this.toast('Failed to open Google Calendar', 'error');
        }
    },

    // Outlook Web Calendar
    async openOutlookCalendar(eventId) {
        try {
            const { data: event } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (!event) return;

            const startDate = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
            const endDate = event.end_time
                ? new Date(event.event_date + 'T' + event.end_time)
                : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const params = new URLSearchParams({
                path: '/calendar/action/compose',
                rru: 'addevent',
                subject: event.event_name,
                startdt: startDate.toISOString(),
                enddt: endDate.toISOString(),
                body: event.description || '',
                location: event.venue || ''
            });

            const url = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
            window.open(url, '_blank', 'noopener,noreferrer');

            this.toast('Opening Outlook Calendar...', 'info');
        } catch (err) {
            console.error('Outlook Calendar error:', err);
            this.toast('Failed to open Outlook Calendar', 'error');
        }
    },

    // Yahoo Calendar
    async openYahooCalendar(eventId) {
        try {
            const { data: event } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (!event) return;

            const startDate = new Date(event.event_date + 'T' + (event.event_time || '00:00:00'));
            const endDate = event.end_time
                ? new Date(event.event_date + 'T' + event.end_time)
                : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const formatYahoo = (d) => {
                return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const params = new URLSearchParams({
                v: '60',
                view: 'd',
                type: '20',
                title: event.event_name,
                st: formatYahoo(startDate),
                et: formatYahoo(endDate),
                desc: event.description || '',
                in_loc: event.venue || ''
            });

            const url = `https://calendar.yahoo.com/?${params.toString()}`;
            window.open(url, '_blank', 'noopener,noreferrer');

            this.toast('Opening Yahoo Calendar...', 'info');
        } catch (err) {
            console.error('Yahoo Calendar error:', err);
            this.toast('Failed to open Yahoo Calendar', 'error');
        }
    },

    // ============================================================
    // SHARE EVENT
    // ============================================================
    async shareEvent(eventId) {
        try {
            const { data: event } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (!event) return;

            const dateStr = new Date(event.event_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const shareTitle = event.event_name;
            const shareText = `Check out this project by Rotaract Club of Coimbatore Unity:\n\n${event.event_name}\nDate: ${dateStr}\nTime: ${this.formatTime(event.event_time)}\n${event.venue ? 'Venue: ' + event.venue + '\n' : ''}\n${event.description ? event.description + '\n' : ''}`;
            const shareUrl = window.location.origin + window.location.pathname + '#event-' + eventId;

            // Try native share API
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: shareUrl
                    });
                    return;
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') return; // User cancelled
                    console.log('Native share failed, showing menu');
                }
            }

            // Fallback: Show share menu
            this.showShareMenu(shareTitle, shareText, shareUrl);
        } catch (err) {
            console.error('Share error:', err);
            this.toast('Failed to share event', 'error');
        }
    },

    showShareMenu(title, text, url) {
        const existing = document.getElementById('shareMenu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'shareMenu';
        menu.className = 'calendar-options-menu';

        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);

        menu.innerHTML = `
            <div class="calendar-options-content glass-card">
                <div class="calendar-options-header">
                    <h3><i data-feather="share-2"></i>Share Event</h3>
                    <button class="calendar-options-close" onclick="document.getElementById('shareMenu').remove()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="calendar-options-list">
                    <a href="https://wa.me/?text=${encodedText}%20${encodedUrl}" target="_blank" rel="noopener" class="calendar-option-btn" onclick="document.getElementById('shareMenu').remove()">
                        <i data-feather="message-circle"></i>
                        <div><strong>WhatsApp</strong><span>Share via WhatsApp</span></div>
                    </a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener" class="calendar-option-btn" onclick="document.getElementById('shareMenu').remove()">
                        <i data-feather="facebook"></i>
                        <div><strong>Facebook</strong><span>Share on Facebook</span></div>
                    </a>
                    <a href="https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}" target="_blank" rel="noopener" class="calendar-option-btn" onclick="document.getElementById('shareMenu').remove()">
                        <i data-feather="twitter"></i>
                        <div><strong>Twitter / X</strong><span>Share on Twitter</span></div>
                    </a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener" class="calendar-option-btn" onclick="document.getElementById('shareMenu').remove()">
                        <i data-feather="linkedin"></i>
                        <div><strong>LinkedIn</strong><span>Share on LinkedIn</span></div>
                    </a>
                    <a href="mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}" class="calendar-option-btn" onclick="document.getElementById('shareMenu').remove()">
                        <i data-feather="mail"></i>
                        <div><strong>Email</strong><span>Send via email</span></div>
                    </a>
                    <button class="calendar-option-btn" onclick="Events.copyToClipboard('${text.replace(/'/g, "\\'").replace(/\n/g, '\\n')} ${url}'); document.getElementById('shareMenu').remove();">
                        <i data-feather="copy"></i>
                        <div><strong>Copy Link</strong><span>Copy to clipboard</span></div>
                    </button>
                </div>
            </div>
        `;

        this.injectCalendarMenuStyles();
        document.body.appendChild(menu);
        if (typeof feather !== 'undefined') feather.replace();

        setTimeout(() => {
            menu.addEventListener('click', (e) => {
                if (e.target === menu) menu.remove();
            });
        }, 100);
    },

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            this.toast('Copied to clipboard', 'success');
        } catch (err) {
            console.error('Copy error:', err);
            this.toast('Failed to copy', 'error');
        }
    },

    // ============================================================
    // DIRECTIONS
    // ============================================================
    openDirections(venue) {
        const encoded = encodeURIComponent(venue + ', Coimbatore, Tamil Nadu');
        const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    },

    // ============================================================
    // FULLSCREEN PHOTO VIEWER
    // ============================================================
    viewPhotoFullscreen(photoUrl) {
        const existing = document.getElementById('photoFullscreen');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'photoFullscreen';
        overlay.className = 'photo-fullscreen-overlay';
        overlay.innerHTML = `
            <button class="photo-fullscreen-close" onclick="document.getElementById('photoFullscreen').remove()" aria-label="Close">
                <i data-feather="x"></i>
            </button>
            <img src="${this.esc(photoUrl)}" alt="Event photo" class="photo-fullscreen-img" onclick="event.stopPropagation()">
        `;

        // Inject styles
        if (!document.getElementById('photoFullscreenStyles')) {
            const style = document.createElement('style');
            style.id = 'photoFullscreenStyles';
            style.textContent = `
                .photo-fullscreen-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 9800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    animation: fadeIn 0.3s ease;
                    cursor: zoom-out;
                }
                .photo-fullscreen-img {
                    max-width: 100%;
                    max-height: 100%;
                    border-radius: var(--radius-md);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    animation: modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    cursor: default;
                }
                .photo-fullscreen-close {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    z-index: 10;
                }
                .photo-fullscreen-close:hover {
                    background: var(--danger);
                    transform: rotate(90deg) scale(1.1);
                }
                .photo-fullscreen-close i {
                    width: 22px;
                    height: 22px;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        if (typeof feather !== 'undefined') feather.replace();

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // ESC to close
        const closeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', closeHandler);
            }
        };
        document.addEventListener('keydown', closeHandler);
    },

    // ============================================================
    // RENDERING HELPERS
    // ============================================================
    renderEmptyState(icon, title, subtitle = '') {
        return `
            <div class="empty-state glass-card">
                <i data-feather="${icon}"></i>
                <p><strong>${this.esc(title)}</strong></p>
                ${subtitle ? `<p style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.7;">${this.esc(subtitle)}</p>` : ''}
            </div>
        `;
    },

    renderLoadingState() {
        return `
            <div class="empty-state glass-card">
                <div style="width: 60px; height: 60px; margin: 0 auto 1rem; border: 3px solid var(--border-color); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p>Loading...</p>
            </div>
        `;
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

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    },

    capitalize(str) {
        if (!str) return '';
        return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    },

    getDaysAway(dateStr) {
        try {
            const eventDate = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            const diffTime = eventDate - today;
            return Math.round(diffTime / (1000 * 60 * 60 * 24));
        } catch {
            return null;
        }
    },

    formatDaysAway(days) {
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        if (days < 0) return `${Math.abs(days)} days ago`;
        return `In ${days} days`;
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
// ADDITIONAL STYLES FOR EVENTS
// ============================================================
(function injectEventStyles() {
    if (document.getElementById('eventsAdditionalStyles')) return;

    const style = document.createElement('style');
    style.id = 'eventsAdditionalStyles';
    style.textContent = `
        .event-days-badge {
            display: inline-block;
            padding: 0.2rem 0.6rem;
            background: var(--gradient-success);
            color: white;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 6px var(--success-glow);
        }
        .event-modal-section {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
        }
        .event-modal-section-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.75rem;
        }
        .event-modal-section-title i {
            width: 18px;
            height: 18px;
            color: var(--primary);
        }
        .event-card {
            outline: none;
        }
        .event-card:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
        }
    `;
    document.head.appendChild(style);
})();

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for App to load first, then initialize Events
    setTimeout(() => {
        if (typeof Events !== 'undefined') Events.init();
    }, 100);
});

// Global exposure
window.Events = Events;