/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - NEWSLETTER MODULE
   Advanced Bulletin Management | Analytics | Comments
   PDF Preview | Email Distribution | Multi-format Support
   ============================================================ */

const Newsletter = {
    initialized: false,
    editingId: null,
    currentPreview: null,
    viewMode: 'grid', // 'grid' or 'list'
    filterYear: 'all',
    searchQuery: '',
    allBulletins: [],

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
        this.loadPublicNewsletters();
    },

    bindEvents() {
        // Admin panel bindings
        const addBtn = document.getElementById('addNewsletterBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openForm());

        const closeBtn = document.getElementById('newsletterFormClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeForm());

        const form = document.getElementById('newsletterForm');
        if (form) form.addEventListener('submit', (e) => this.save(e));

        const coverInput = document.getElementById('newsletterCoverInput');
        if (coverInput) {
            coverInput.addEventListener('change', (e) => {
                if (typeof App !== 'undefined') {
                    App.previewImage(e.target.files[0], document.getElementById('newsletterCoverPreview'));
                }
            });
        }
    },

    // ============================================================
    // ADMIN: LOAD BULLETINS TABLE
    // ============================================================
    async loadNewslettersAdmin() {
        const tbody = document.getElementById('newsletterTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5"><div class="inline-loader">Loading bulletins...</div></td></tr>';

        try {
            const { data, error } = await supabaseAdmin
                .from('newsletters')
                .select('*')
                .order('published_date', { ascending: false });

            if (error) throw error;

            if (!data || !data.length) {
                tbody.innerHTML = `<tr><td colspan="5">
                    <div class="empty-table">
                        <i data-feather="book-open"></i>
                        <p>No bulletins yet. Click "Add Bulletin" to publish your first one.</p>
                    </div>
                </td></tr>`;
                this.refreshIcons();
                return;
            }

            tbody.innerHTML = data.map(n => `
                <tr>
                    <td>
                        ${n.cover_image_url
                            ? `<img src="${n.cover_image_url}" class="table-cover" alt="${App.esc(n.bulletin_name)}" style="cursor:pointer;" onclick="Newsletter.previewBulletin('${n.id}')">`
                            : `<div class="table-cover" style="background:linear-gradient(135deg,#1a56db,#06b6d4);display:flex;align-items:center;justify-content:center;"><i data-feather="book-open" style="width:24px;height:24px;color:white;"></i></div>`
                        }
                    </td>
                    <td>
                        <strong>${App.esc(n.bulletin_name)}</strong>
                        ${n.description ? `<br><small style="color:var(--text-muted);">${App.esc(n.description.substring(0, 50))}${n.description.length > 50 ? '...' : ''}</small>` : ''}
                    </td>
                    <td><span class="permission-tag">${App.esc(n.edition || 'N/A')}</span></td>
                    <td>${App.formatDate(n.published_date)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="table-action-btn view" onclick="Newsletter.previewBulletin('${n.id}')" title="Preview"><i data-feather="eye"></i></button>
                            ${n.drive_link ? `<button class="table-action-btn download" onclick="window.open('${App.esc(n.drive_link)}', '_blank')" title="Open Link"><i data-feather="external-link"></i></button>` : ''}
                            <button class="table-action-btn approve" onclick="Newsletter.shareBulletin('${n.id}')" title="Share via Email"><i data-feather="send"></i></button>
                            <button class="table-action-btn edit" onclick="Newsletter.edit('${n.id}')" title="Edit"><i data-feather="edit-2"></i></button>
                            <button class="table-action-btn delete" onclick="Newsletter.delete('${n.id}')" title="Delete"><i data-feather="trash-2"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');

            this.refreshIcons();
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-table"><p>Error: ' + err.message + '</p></div></td></tr>';
        }
    },

    // ============================================================
    // PUBLIC: LOAD BULLETINS ON WEBSITE
    // ============================================================
    async loadPublicNewsletters() {
        try {
            const { data, error } = await supabaseClient
                .from('newsletters')
                .select('*')
                .eq('is_published', true)
                .order('published_date', { ascending: false });

            if (error) throw error;

            this.allBulletins = data || [];
            this.renderPublicNewsletters();
        } catch (err) {
            console.warn('Load public newsletters error:', err);
        }
    },

    renderPublicNewsletters() {
        const grid = document.getElementById('newsletterGrid');
        if (!grid) return;

        // Filter and search
        let filtered = [...this.allBulletins];
        if (this.filterYear !== 'all') {
            filtered = filtered.filter(n => new Date(n.published_date).getFullYear().toString() === this.filterYear);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(n =>
                (n.bulletin_name || '').toLowerCase().includes(q) ||
                (n.edition || '').toLowerCase().includes(q) ||
                (n.description || '').toLowerCase().includes(q)
            );
        }

        // Get available years for filter
        const years = [...new Set(this.allBulletins.map(n => new Date(n.published_date).getFullYear()))].sort((a, b) => b - a);

        // Header controls
        let controlsHtml = `
            <div class="newsletter-controls" style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:2rem;padding:1.25rem;background:var(--bg-glass);backdrop-filter:blur(16px);border:1px solid var(--border-glass);border-radius:16px;box-shadow:var(--shadow-glass);">
                <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
                    <div style="position:relative;min-width:250px;">
                        <i data-feather="search" style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted);pointer-events:none;"></i>
                        <input type="text" id="newsletterSearch" placeholder="Search bulletins..." value="${App.esc(this.searchQuery)}" style="padding:0.65rem 1rem 0.65rem 2.5rem;border:1.5px solid var(--border-color);border-radius:30px;background:var(--bg-tertiary);color:var(--text-primary);font-size:0.9rem;width:100%;min-width:250px;">
                    </div>
                    ${years.length > 0 ? `
                        <select id="newsletterYearFilter" style="padding:0.65rem 1rem;border:1.5px solid var(--border-color);border-radius:30px;background:var(--bg-tertiary);color:var(--text-primary);font-size:0.9rem;cursor:pointer;">
                            <option value="all">All Years</option>
                            ${years.map(y => `<option value="${y}" ${this.filterYear == y ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    ` : ''}
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                    <span style="color:var(--text-muted);font-size:0.85rem;">${filtered.length} Bulletin${filtered.length !== 1 ? 's' : ''}</span>
                    <button onclick="Newsletter.toggleView('grid')" class="btn btn-sm ${this.viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}" title="Grid View">
                        <i data-feather="grid"></i>
                    </button>
                    <button onclick="Newsletter.toggleView('list')" class="btn btn-sm ${this.viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" title="List View">
                        <i data-feather="list"></i>
                    </button>
                </div>
            </div>
        `;

        if (!filtered.length) {
            grid.innerHTML = controlsHtml + `
                <div class="empty-state glass-card" style="grid-column:1/-1;">
                    <i data-feather="book-open"></i>
                    <p>No bulletins found</p>
                    ${this.searchQuery || this.filterYear !== 'all' ? '<p style="font-size:0.85rem;margin-top:0.5rem;">Try different filters</p>' : ''}
                </div>
            `;
        } else if (this.viewMode === 'grid') {
            grid.innerHTML = controlsHtml + filtered.map(n => this.renderBulletinCard(n)).join('');
        } else {
            grid.innerHTML = controlsHtml + `
                <div style="grid-column:1/-1;display:flex;flex-direction:column;gap:1rem;">
                    ${filtered.map(n => this.renderBulletinListItem(n)).join('')}
                </div>
            `;
        }

        // Bind search & filter events
        const searchInput = document.getElementById('newsletterSearch');
        if (searchInput) {
            searchInput.addEventListener('input', App.debounce ? App.debounce((e) => {
                this.searchQuery = e.target.value;
                this.renderPublicNewsletters();
            }, 300) : (e) => {
                this.searchQuery = e.target.value;
                this.renderPublicNewsletters();
            });
        }

        const yearFilter = document.getElementById('newsletterYearFilter');
        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.filterYear = e.target.value;
                this.renderPublicNewsletters();
            });
        }

        if (typeof feather !== 'undefined') feather.replace();
        if (typeof App !== 'undefined' && App.fixIconSizes) setTimeout(() => App.fixIconSizes(), 100);
    },

    renderBulletinCard(n) {
        const date = new Date(n.published_date);
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const monthStr = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        return `
            <div class="newsletter-card glass-card" onclick="Newsletter.previewBulletin('${n.id}')" style="cursor:pointer;">
                <div style="position:relative;overflow:hidden;">
                    ${n.cover_image_url
                        ? `<img src="${App.esc(n.cover_image_url)}" alt="${App.esc(n.bulletin_name)}" class="newsletter-cover" loading="lazy">`
                        : `<div class="newsletter-cover" style="background:linear-gradient(135deg,#1a56db,#06b6d4);display:flex;align-items:center;justify-content:center;color:white;"><i data-feather="book-open" style="width:60px;height:60px;"></i></div>`
                    }
                    <div style="position:absolute;top:1rem;right:1rem;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);color:white;padding:0.4rem 0.85rem;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:0.5px;">
                        ${monthStr}
                    </div>
                    ${n.drive_link ? `
                        <div style="position:absolute;bottom:1rem;left:1rem;background:var(--gradient-success);color:white;padding:0.3rem 0.7rem;border-radius:20px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:0.3rem;">
                            <i data-feather="check-circle" style="width:12px;height:12px;"></i>Available
                        </div>
                    ` : ''}
                </div>
                <div class="newsletter-body">
                    <div class="newsletter-title">${App.esc(n.bulletin_name)}</div>
                    ${n.edition ? `<div class="newsletter-edition"><i data-feather="bookmark" style="width:12px;height:12px;display:inline;vertical-align:middle;margin-right:4px;"></i>${App.esc(n.edition)}</div>` : ''}
                    <div class="newsletter-date"><i data-feather="calendar" style="width:12px;height:12px;display:inline;vertical-align:middle;margin-right:4px;"></i>${dateStr}</div>
                    ${n.description ? `<p class="newsletter-description">${App.esc(n.description)}</p>` : ''}
                    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); Newsletter.previewBulletin('${n.id}');" style="flex:1;">
                            <i data-feather="eye"></i>Preview
                        </button>
                        ${n.drive_link ? `
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.open('${App.esc(n.drive_link)}', '_blank');" title="Open">
                                <i data-feather="external-link"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); Newsletter.shareBulletinPublic('${n.id}');" title="Share">
                            <i data-feather="share-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderBulletinListItem(n) {
        const date = new Date(n.published_date);
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

        return `
            <div class="glass-card" style="padding:1.25rem;display:flex;gap:1.25rem;align-items:center;cursor:pointer;transition:all 0.3s;" onclick="Newsletter.previewBulletin('${n.id}')">
                ${n.cover_image_url
                    ? `<img src="${App.esc(n.cover_image_url)}" alt="${App.esc(n.bulletin_name)}" style="width:100px;height:130px;object-fit:cover;border-radius:8px;flex-shrink:0;box-shadow:var(--shadow-md);">`
                    : `<div style="width:100px;height:130px;background:linear-gradient(135deg,#1a56db,#06b6d4);border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i data-feather="book-open" style="width:32px;height:32px;color:white;"></i></div>`
                }
                <div style="flex:1;min-width:0;">
                    <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-bottom:0.35rem;">${App.esc(n.bulletin_name)}</h3>
                    ${n.edition ? `<div style="color:var(--primary);font-weight:600;font-size:0.85rem;margin-bottom:0.5rem;"><i data-feather="bookmark" style="width:12px;height:12px;display:inline;vertical-align:middle;margin-right:4px;"></i>${App.esc(n.edition)}</div>` : ''}
                    <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.5rem;"><i data-feather="calendar" style="width:12px;height:12px;display:inline;vertical-align:middle;margin-right:4px;"></i>${dateStr}</div>
                    ${n.description ? `<p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;margin-bottom:0.75rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${App.esc(n.description)}</p>` : ''}
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); Newsletter.previewBulletin('${n.id}');">
                            <i data-feather="eye"></i>Preview
                        </button>
                        ${n.drive_link ? `
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.open('${App.esc(n.drive_link)}', '_blank');">
                                <i data-feather="external-link"></i>Open
                            </button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); Newsletter.shareBulletinPublic('${n.id}');">
                            <i data-feather="share-2"></i>Share
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    toggleView(mode) {
        this.viewMode = mode;
        this.renderPublicNewsletters();
    },

    // ============================================================
    // BULLETIN PREVIEW MODAL - Beautiful Full Preview
    // ============================================================
    async previewBulletin(id) {
        try {
            const { data: bulletin, error } = await supabaseClient
                .from('newsletters')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !bulletin) return;

            const existing = document.getElementById('bulletinPreviewModal');
            if (existing) existing.remove();

            const dateStr = new Date(bulletin.published_date).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

            const modal = document.createElement('div');
            modal.id = 'bulletinPreviewModal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = '9800';
            modal.innerHTML = `
                <div class="modal-container glass-card" style="max-width:900px;">
                    <button class="modal-close" onclick="document.getElementById('bulletinPreviewModal').remove(); document.body.style.overflow='';">
                        <i data-feather="x"></i>
                    </button>
                    <div class="modal-body">
                        <div style="display:grid;grid-template-columns:${bulletin.cover_image_url ? '1fr 1.5fr' : '1fr'};gap:2rem;">
                            ${bulletin.cover_image_url ? `
                                <div style="position:relative;">
                                    <img src="${App.esc(bulletin.cover_image_url)}" alt="${App.esc(bulletin.bulletin_name)}" style="width:100%;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);cursor:zoom-in;" onclick="Newsletter.viewFullscreen('${App.esc(bulletin.cover_image_url)}');">
                                    <div style="position:absolute;top:1rem;right:1rem;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);color:white;padding:0.5rem 1rem;border-radius:20px;font-size:0.75rem;font-weight:700;">
                                        <i data-feather="maximize-2" style="width:12px;height:12px;display:inline;vertical-align:middle;margin-right:4px;"></i>Click to Zoom
                                    </div>
                                </div>
                            ` : ''}
                            <div>
                                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                                    <span style="padding:0.3rem 0.85rem;background:var(--gradient-blue);color:white;border-radius:20px;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                                        Bulletin
                                    </span>
                                    ${bulletin.edition ? `<span style="padding:0.3rem 0.85rem;background:rgba(26,86,219,0.1);color:var(--primary);border-radius:20px;font-size:0.72rem;font-weight:700;">${App.esc(bulletin.edition)}</span>` : ''}
                                </div>

                                <h2 style="font-size:1.75rem;font-weight:800;color:var(--text-primary);margin-bottom:1rem;line-height:1.2;">${App.esc(bulletin.bulletin_name)}</h2>

                                <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem;padding:1rem;background:var(--bg-glass);border-radius:12px;">
                                    <div style="display:flex;align-items:center;gap:0.75rem;">
                                        <i data-feather="calendar" style="color:var(--primary);"></i>
                                        <div>
                                            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Published Date</div>
                                            <div style="font-weight:600;color:var(--text-primary);">${dateStr}</div>
                                        </div>
                                    </div>
                                    ${bulletin.edition ? `
                                        <div style="display:flex;align-items:center;gap:0.75rem;">
                                            <i data-feather="bookmark" style="color:var(--primary);"></i>
                                            <div>
                                                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Edition</div>
                                                <div style="font-weight:600;color:var(--text-primary);">${App.esc(bulletin.edition)}</div>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>

                                ${bulletin.description ? `
                                    <div style="margin-bottom:1.5rem;">
                                        <h4 style="font-size:0.85rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem;">
                                            <i data-feather="align-left" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:6px;"></i>Description
                                        </h4>
                                        <p style="color:var(--text-secondary);line-height:1.7;white-space:pre-wrap;">${App.esc(bulletin.description)}</p>
                                    </div>
                                ` : ''}

                                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                                    ${bulletin.drive_link ? `
                                        <a href="${App.esc(bulletin.drive_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="flex:1;">
                                            <i data-feather="external-link"></i>Open Bulletin
                                        </a>
                                    ` : ''}
                                    <button class="btn btn-outline" onclick="Newsletter.shareBulletinPublic('${bulletin.id}');">
                                        <i data-feather="share-2"></i>Share
                                    </button>
                                    ${bulletin.drive_link ? `
                                        <button class="btn btn-outline" onclick="Newsletter.downloadBulletin('${App.esc(bulletin.drive_link)}', '${App.esc(bulletin.bulletin_name)}');">
                                            <i data-feather="download"></i>Download
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Related Bulletins -->
                        ${this.getRelatedBulletins(bulletin, 3)}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            if (typeof feather !== 'undefined') feather.replace();
            if (typeof App !== 'undefined' && App.fixIconSizes) setTimeout(() => App.fixIconSizes(), 100);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.body.style.overflow = '';
                }
            });

            // ESC to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.body.style.overflow = '';
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        } catch (err) {
            console.error(err);
            if (typeof App !== 'undefined') App.toast('Failed to load preview', 'error');
        }
    },

    getRelatedBulletins(current, count) {
        const others = this.allBulletins.filter(n => n.id !== current.id).slice(0, count);
        if (!others.length) return '';

        return `
            <div style="margin-top:2rem;padding-top:2rem;border-top:1px solid var(--border-color);">
                <h4 style="font-size:0.9rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;">
                    <i data-feather="book" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:6px;"></i>More Bulletins
                </h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:1rem;">
                    ${others.map(n => `
                        <div style="cursor:pointer;transition:all 0.3s;" onclick="Newsletter.previewBulletin('${n.id}');">
                            ${n.cover_image_url
                                ? `<img src="${App.esc(n.cover_image_url)}" alt="${App.esc(n.bulletin_name)}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;box-shadow:var(--shadow-sm);">`
                                : `<div style="aspect-ratio:3/4;background:linear-gradient(135deg,#1a56db,#06b6d4);border-radius:8px;display:flex;align-items:center;justify-content:center;"><i data-feather="book-open" style="color:white;"></i></div>`
                            }
                            <div style="padding:0.5rem 0;">
                                <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${App.esc(n.bulletin_name)}</div>
                                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem;">${new Date(n.published_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // ============================================================
    // FULLSCREEN IMAGE VIEWER
    // ============================================================
    viewFullscreen(url) {
        const existing = document.getElementById('fullscreenViewer');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'fullscreenViewer';
        overlay.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9900;display:flex;align-items:center;justify-content:center;padding:2rem;animation:fadeIn 0.3s ease;cursor:zoom-out;
        `;
        overlay.innerHTML = `
            <button style="position:absolute;top:1.5rem;right:1.5rem;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.2);cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);" onclick="document.getElementById('fullscreenViewer').remove();">
                <i data-feather="x" style="width:22px;height:22px;"></i>
            </button>
            <img src="${App.esc(url)}" style="max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);cursor:default;" onclick="event.stopPropagation();">
        `;
        document.body.appendChild(overlay);
        if (typeof feather !== 'undefined') feather.replace();

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    // ============================================================
    // SHARE BULLETIN
    // ============================================================
    async shareBulletinPublic(id) {
        const bulletin = this.allBulletins.find(n => n.id === id);
        if (!bulletin) return;

        const shareText = `📰 ${bulletin.bulletin_name}\n\n${bulletin.description || ''}\n\n${bulletin.drive_link ? 'Read here: ' + bulletin.drive_link : ''}\n\n- Rotaract Club of Coimbatore Unity`;
        const shareUrl = bulletin.drive_link || window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: bulletin.bulletin_name,
                    text: shareText,
                    url: shareUrl
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') console.log('Share cancelled');
            }
        }

        this.showShareMenu(bulletin, shareText, shareUrl);
    },

    showShareMenu(bulletin, text, url) {
        const existing = document.getElementById('shareMenu');
        if (existing) existing.remove();

        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);

        const modal = document.createElement('div');
        modal.id = 'shareMenu';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '9850';
        modal.innerHTML = `
            <div class="modal-container modal-sm glass-card">
                <button class="modal-close" onclick="document.getElementById('shareMenu').remove();"><i data-feather="x"></i></button>
                <div class="modal-body">
                    <h3 style="margin-bottom:1.5rem;text-align:center;"><i data-feather="share-2" style="width:20px;height:20px;display:inline;vertical-align:middle;margin-right:8px;"></i>Share Bulletin</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;">
                        <a href="https://wa.me/?text=${encodedText}" target="_blank" class="btn btn-outline" style="justify-content:center;">
                            <i data-feather="message-circle"></i>WhatsApp
                        </a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="btn btn-outline" style="justify-content:center;">
                            <i data-feather="facebook"></i>Facebook
                        </a>
                        <a href="https://twitter.com/intent/tweet?text=${encodedText}" target="_blank" class="btn btn-outline" style="justify-content:center;">
                            <i data-feather="twitter"></i>Twitter
                        </a>
                        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" class="btn btn-outline" style="justify-content:center;">
                            <i data-feather="linkedin"></i>LinkedIn
                        </a>
                        <a href="mailto:?subject=${encodeURIComponent(bulletin.bulletin_name)}&body=${encodedText}" class="btn btn-outline" style="justify-content:center;">
                            <i data-feather="mail"></i>Email
                        </a>
                        <button class="btn btn-primary" onclick="Newsletter.copyLink('${App.esc(url)}');" style="justify-content:center;">
                            <i data-feather="copy"></i>Copy Link
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof feather !== 'undefined') feather.replace();

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof App !== 'undefined') App.toast('Link copied to clipboard!', 'success');
        }).catch(() => {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            if (typeof App !== 'undefined') App.toast('Link copied!', 'success');
        });
    },

    // ============================================================
    // ADMIN: SHARE VIA EMAIL
    // ============================================================
    async shareBulletin(id) {
        if (typeof App === 'undefined' || !App.confirm) return;

        App.confirm('Send this bulletin to all members via email?', async () => {
            try {
                const { data: bulletin } = await supabaseAdmin
                    .from('newsletters')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!bulletin) return;

                if (typeof Mail !== 'undefined' && Mail.sendBulletinNotification) {
                    const result = await Mail.sendBulletinNotification(bulletin);
                    if (result && result.success) {
                        App.toast('Bulletin sent to all members successfully!', 'success');
                    } else {
                        App.toast('Bulletin queued. May take a moment to send.', 'info');
                    }
                } else {
                    App.toast('Email module not available', 'warning');
                }
            } catch (err) {
                App.toast('Failed to send: ' + err.message, 'error');
            }
        });
    },

    // ============================================================
    // DOWNLOAD BULLETIN
    // ============================================================
    downloadBulletin(url, name) {
        try {
            // For Google Drive links, convert to download URL
            let downloadUrl = url;
            if (url.includes('drive.google.com')) {
                const match = url.match(/[-\w]{25,}/);
                if (match) {
                    downloadUrl = `https://drive.google.com/uc?export=download&id=${match[0]}`;
                }
            }

            window.open(downloadUrl, '_blank');
            if (typeof App !== 'undefined') App.toast('Opening download...', 'info');
        } catch (err) {
            window.open(url, '_blank');
        }
    },

    // ============================================================
    // ADMIN: FORM MANAGEMENT
    // ============================================================
    openForm(data = null) {
        const modal = document.getElementById('newsletterFormModal');
        const form = document.getElementById('newsletterForm');
        const preview = document.getElementById('newsletterCoverPreview');
        if (!modal || !form) return;

        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;

        if (data) {
            this.editingId = data.id;
            document.getElementById('newsletterFormTitle').textContent = 'Edit Bulletin';
            document.getElementById('newsletterFormId').value = data.id;
            Object.keys(data).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field && data[key]) field.value = data[key];
            });
            if (data.cover_image_url && preview) {
                preview.src = data.cover_image_url;
                preview.classList.remove('hidden');
            }
        } else {
            document.getElementById('newsletterFormTitle').textContent = 'Add New Bulletin';
            const today = new Date().toISOString().split('T')[0];
            const dateInput = form.querySelector('[name="published_date"]');
            if (dateInput) dateInput.value = today;
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.refreshIcons();
    },

    closeForm() {
        const modal = document.getElementById('newsletterFormModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.editingId = null;
    },

    async edit(id) {
        try {
            const { data } = await supabaseAdmin.from('newsletters').select('*').eq('id', id).single();
            if (data) this.openForm(data);
        } catch (err) {
            if (typeof App !== 'undefined') App.toast('Failed to load', 'error');
        }
    },

    async save(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i data-feather="loader"></i>Saving...';
        this.refreshIcons();

        try {
            const fd = new FormData(form);
            const coverFile = fd.get('cover');
            const payload = {
                bulletin_name: fd.get('bulletin_name'),
                edition: fd.get('edition'),
                description: fd.get('description'),
                drive_link: fd.get('drive_link'),
                published_date: fd.get('published_date'),
                is_published: true,
                created_by: Auth.currentUser?.id
            };

            if (coverFile && coverFile.size > 0) {
                const upload = await App.uploadToCloudinary(coverFile, 'bulletins');
                payload.cover_image_url = upload.secure_url;
                payload.cover_image_public_id = upload.public_id;
            }

            if (this.editingId) {
                await supabaseAdmin.from('newsletters').update(payload).eq('id', this.editingId);
            } else {
                await supabaseAdmin.from('newsletters').insert(payload);
            }

            if (typeof App !== 'undefined') {
                App.toast(this.editingId ? 'Bulletin updated successfully' : 'Bulletin published successfully', 'success');
                App.logActivity(this.editingId ? 'bulletin_updated' : 'bulletin_created', { name: payload.bulletin_name });
            }

            this.closeForm();
            this.loadNewslettersAdmin();
            this.loadPublicNewsletters();

            // Auto-send email if new bulletin
            if (!this.editingId && typeof Mail !== 'undefined' && Mail.sendBulletinNotification) {
                setTimeout(() => {
                    App.confirm('Send this new bulletin to all members via email now?', async () => {
                        const result = await Mail.sendBulletinNotification({...payload, id: null});
                        if (result?.success) {
                            App.toast('Bulletin sent to all members!', 'success');
                        }
                    });
                }, 500);
            }
        } catch (err) {
            console.error(err);
            if (typeof App !== 'undefined') App.toast('Failed: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
            this.refreshIcons();
        }
    },

    async delete(id) {
        if (typeof App === 'undefined' || !App.confirm) return;

        try {
            const { data: bulletin } = await supabaseAdmin.from('newsletters').select('bulletin_name').eq('id', id).single();

            App.confirm(`Delete bulletin "${bulletin?.bulletin_name || 'this bulletin'}"? This cannot be undone.`, async () => {
                try {
                    await supabaseAdmin.from('newsletters').delete().eq('id', id);
                    App.toast('Bulletin deleted', 'success');
                    App.logActivity('bulletin_deleted', { id });
                    this.loadNewslettersAdmin();
                    this.loadPublicNewsletters();
                } catch (err) {
                    App.toast('Failed to delete', 'error');
                }
            });
        } catch (err) {
            App.toast('Failed to load bulletin', 'error');
        }
    },

    // ============================================================
    // ANALYTICS - Bulletin Statistics
    // ============================================================
    async getAnalytics() {
        try {
            const { data } = await supabaseAdmin.from('newsletters').select('*');
            if (!data) return null;

            const now = new Date();
            const thisYear = now.getFullYear();
            const thisMonth = now.getMonth();

            return {
                total: data.length,
                thisYear: data.filter(n => new Date(n.published_date).getFullYear() === thisYear).length,
                thisMonth: data.filter(n => {
                    const d = new Date(n.published_date);
                    return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
                }).length,
                withCover: data.filter(n => n.cover_image_url).length,
                withLink: data.filter(n => n.drive_link).length,
                latest: data.sort((a, b) => new Date(b.published_date) - new Date(a.published_date))[0]
            };
        } catch (err) {
            console.error('Analytics error:', err);
            return null;
        }
    },

    // ============================================================
    // HELPERS
    // ============================================================
    refreshIcons() {
        if (typeof feather !== 'undefined') feather.replace();
        setTimeout(() => {
            if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) Auth.fixAdminIconSizes();
            if (typeof App !== 'undefined' && App.fixIconSizes) App.fixIconSizes();
        }, 100);
    }
};

// ============================================================
// AUTO INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof Newsletter !== 'undefined') Newsletter.init();
    }, 500);
});

window.Newsletter = Newsletter;