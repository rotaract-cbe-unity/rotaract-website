/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - MEMBERS MODULE
   Reads ONLY from club_members table | Birthday Triggers
   Profile Modal | Contact Actions | Bug-Free
   ============================================================ */

var Members = {
    initialized: false,
    allMembers: [],
    currentFilter: 'all',
    lastBirthdayCheck: null,

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
        this.loadMembers('all');
        this.checkBirthdays();

        // Check birthdays every 30 minutes
        var self = this;
        setInterval(function() { self.checkBirthdays(); }, 30 * 60 * 1000);

        console.log('Members module initialized (using club_members table)');
    },

    bindEvents: function() {
        var self = this;
        document.querySelectorAll('.filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                self.currentFilter = btn.dataset.filter;
                self.loadMembers(self.currentFilter);
            });
        });
    },

    // ============================================================
    // LOAD MEMBERS - ONLY FROM club_members TABLE
    // ============================================================
    loadMembers: function(filter) {
        var grid = document.getElementById('membersGrid');
        if (!grid) return;

        // Show loading
        grid.innerHTML = '<div class="empty-state glass-card"><div style="width:40px;height:40px;margin:0 auto 1rem;border:3px solid var(--border-color);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div><p>Loading members...</p></div>';

        // IMPORTANT: Read ONLY from club_members table, NEVER from users table
        var query = supabaseClient
            .from('club_members')
            .select('*')
            .eq('is_active', true)
            .order('is_board_member', { ascending: false })
            .order('sort_order')
            .order('full_name');

        if (filter === 'board') {
            query = query.eq('is_board_member', true);
        }

        var self = this;

        query.then(function(result) {
            if (result.error) {
                console.error('Load members error:', result.error);
                grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="alert-circle"></i><p>Failed to load members</p></div>';
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }

            var data = result.data || [];
            self.allMembers = data;

            if (!data.length) {
                grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="users"></i><p>' +
                    (filter === 'board' ? 'No board members found' : 'Members will appear here') +
                    '</p></div>';
            } else {
                grid.innerHTML = data.map(function(m) { return self.renderMemberCard(m); }).join('');
            }

            if (typeof feather !== 'undefined') feather.replace();
            if (typeof App !== 'undefined' && App.fixIconSizes) {
                setTimeout(function() { App.fixIconSizes(); }, 100);
            }
        }).catch(function(err) {
            console.error('Members load exception:', err);
            grid.innerHTML = '<div class="empty-state glass-card"><i data-feather="alert-circle"></i><p>Error loading members</p></div>';
            if (typeof feather !== 'undefined') feather.replace();
        });
    },

    // ============================================================
    // RENDER MEMBER CARD
    // ============================================================
    renderMemberCard: function(m) {
        var esc = typeof App !== 'undefined' ? App.esc.bind(App) : function(s) { return s || ''; };
        var initials = this.getInitials(m.full_name);
        var isBirthdayToday = this.isBirthdayToday(m.date_of_birth);

        return '<article class="member-card glass-card" onclick="Members.showMemberProfile(\'' + m.id + '\')" style="cursor:pointer;" role="button" tabindex="0">' +
            (isBirthdayToday ? '<div style="position:absolute;top:0.5rem;left:0.5rem;width:32px;height:32px;background:var(--gradient-danger);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:2;animation:pulse 2s ease-in-out infinite;" title="Birthday Today!"><i data-feather="gift" style="width:16px;height:16px;"></i></div>' : '') +
            (m.is_board_member ? '<div style="position:absolute;top:0.5rem;right:0.5rem;display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.6rem;background:var(--gradient-blue);color:white;border-radius:12px;font-size:0.7rem;font-weight:700;z-index:2;"><i data-feather="star" style="width:11px;height:11px;"></i>Board</div>' : '') +
            (m.photo_url
                ? '<img src="' + esc(m.photo_url) + '" alt="' + esc(m.full_name) + '" class="member-photo" loading="lazy" onerror="this.style.display=\'none\'">'
                : '<div class="member-photo" style="background:var(--gradient-blue);display:flex;align-items:center;justify-content:center;color:white;font-size:2.5rem;font-weight:800;">' + initials + '</div>'
            ) +
            '<div class="member-name">' + esc(m.full_name) + '</div>' +
            '<div class="member-portfolio">' + esc(m.portfolio || 'Member') + '</div>' +
            '<div class="member-details">' +
            (m.ri_id ? '<div class="member-detail"><i data-feather="hash"></i><span>' + esc(m.ri_id) + '</span></div>' : '') +
            (m.email ? '<div class="member-detail"><i data-feather="mail"></i><span style="overflow:hidden;text-overflow:ellipsis;">' + esc(m.email) + '</span></div>' : '') +
            (m.phone ? '<div class="member-detail"><i data-feather="phone"></i><span>' + esc(m.phone) + '</span></div>' : '') +
            (m.blood_group ? '<div class="member-blood-badge">' + esc(m.blood_group) + '</div>' : '') +
            '</div></article>';
    },

    // ============================================================
    // MEMBER PROFILE MODAL
    // ============================================================
    showMemberProfile: function(memberId) {
        var member = null;
        for (var i = 0; i < this.allMembers.length; i++) {
            if (this.allMembers[i].id === memberId) {
                member = this.allMembers[i];
                break;
            }
        }

        if (!member) {
            // Fetch from database if not in cache
            var self = this;
            supabaseClient.from('club_members').select('*').eq('id', memberId).single().then(function(result) {
                if (result.data) self.renderProfileModal(result.data);
            });
            return;
        }

        this.renderProfileModal(member);
    },

    renderProfileModal: function(member) {
        var esc = typeof App !== 'undefined' ? App.esc.bind(App) : function(s) { return s || ''; };

        var existing = document.getElementById('memberProfileModal');
        if (existing) existing.remove();

        var initials = this.getInitials(member.full_name);
        var isBirthdayToday = this.isBirthdayToday(member.date_of_birth);
        var upcomingBirthday = this.getDaysUntilBirthday(member.date_of_birth);

        var modal = document.createElement('div');
        modal.id = 'memberProfileModal';
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');

        modal.innerHTML = '<div class="modal-container glass-card" style="max-width:500px;">' +
            '<button class="modal-close" onclick="document.getElementById(\'memberProfileModal\').remove(); document.body.style.overflow=\'\';"><i data-feather="x"></i></button>' +
            '<div class="modal-body">' +

            // Header
            '<div style="text-align:center;padding-bottom:1.5rem;border-bottom:1px solid var(--border-color);margin-bottom:1.5rem;">' +
            (member.photo_url
                ? '<img src="' + esc(member.photo_url) + '" alt="' + esc(member.full_name) + '" style="width:130px;height:130px;border-radius:50%;object-fit:cover;margin:0 auto 1rem;border:5px solid var(--primary);box-shadow:0 10px 30px var(--primary-glow);display:block;">'
                : '<div style="width:130px;height:130px;border-radius:50%;background:var(--gradient-blue);display:flex;align-items:center;justify-content:center;color:white;font-size:3rem;font-weight:800;margin:0 auto 1rem;border:5px solid var(--primary);box-shadow:0 10px 30px var(--primary-glow);">' + initials + '</div>'
            ) +

            (isBirthdayToday ? '<div style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--gradient-danger);color:white;border-radius:30px;font-size:0.85rem;font-weight:700;margin-bottom:0.75rem;animation:pulse 2s ease-in-out infinite;"><i data-feather="gift" style="width:16px;height:16px;"></i>Happy Birthday!</div>' : '') +

            '<h2 style="font-size:1.5rem;font-weight:700;color:var(--text-primary);margin-bottom:0.35rem;">' + esc(member.full_name) + '</h2>' +
            '<p style="font-size:1rem;color:var(--primary);font-weight:600;margin-bottom:0.75rem;">' + esc(member.portfolio || 'Member') + '</p>' +

            (member.is_board_member ? '<span style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.4rem 1rem;background:var(--gradient-blue);color:white;border-radius:20px;font-size:0.85rem;font-weight:700;"><i data-feather="star" style="width:14px;height:14px;"></i>Board Member</span>' : '') +
            '</div>' +

            // Details
            '<div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem;">' +
            (member.ri_id ? '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-glass);border-radius:12px;border:1px solid var(--border-color);"><div style="width:40px;height:40px;border-radius:10px;background:var(--gradient-blue);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-feather="hash" style="width:18px;height:18px;"></i></div><div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">RI ID</div><div style="font-weight:600;color:var(--text-primary);">' + esc(member.ri_id) + '</div></div></div>' : '') +

            (member.email ? '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-glass);border-radius:12px;border:1px solid var(--border-color);"><div style="width:40px;height:40px;border-radius:10px;background:var(--gradient-blue);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-feather="mail" style="width:18px;height:18px;"></i></div><div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Email</div><a href="mailto:' + esc(member.email) + '" style="font-weight:600;color:var(--primary);word-break:break-word;">' + esc(member.email) + '</a></div></div>' : '') +

            (member.phone ? '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-glass);border-radius:12px;border:1px solid var(--border-color);"><div style="width:40px;height:40px;border-radius:10px;background:var(--gradient-blue);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-feather="phone" style="width:18px;height:18px;"></i></div><div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Phone</div><a href="tel:' + esc(member.phone) + '" style="font-weight:600;color:var(--primary);">' + esc(member.phone) + '</a></div></div>' : '') +

            (member.blood_group ? '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-glass);border-radius:12px;border:1px solid var(--border-color);"><div style="width:40px;height:40px;border-radius:10px;background:var(--gradient-danger);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-feather="droplet" style="width:18px;height:18px;"></i></div><div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Blood Group</div><div style="font-weight:700;color:var(--danger);font-size:1.1rem;">' + esc(member.blood_group) + '</div></div></div>' : '') +

            (member.date_of_birth ? '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-glass);border-radius:12px;border:1px solid var(--border-color);"><div style="width:40px;height:40px;border-radius:10px;background:var(--gradient-blue);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-feather="gift" style="width:18px;height:18px;"></i></div><div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Birthday</div><div style="font-weight:600;color:var(--text-primary);">' + this.formatBirthday(member.date_of_birth) + (upcomingBirthday !== null && upcomingBirthday <= 30 && upcomingBirthday >= 0 ? ' <small style="color:var(--primary);">(' + this.formatDaysAway(upcomingBirthday) + ')</small>' : '') + '</div></div></div>' : '') +

            (member.joined_date ? '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-glass);border-radius:12px;border:1px solid var(--border-color);"><div style="width:40px;height:40px;border-radius:10px;background:var(--gradient-blue);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-feather="calendar" style="width:18px;height:18px;"></i></div><div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Member Since</div><div style="font-weight:600;color:var(--text-primary);">' + this.formatDate(member.joined_date) + '</div></div></div>' : '') +

            '</div>' +

            // Action Buttons
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;padding-top:1rem;border-top:1px solid var(--border-color);">' +
            (member.email ? '<a href="mailto:' + esc(member.email) + '" class="btn btn-primary" style="flex:1;"><i data-feather="mail"></i>Email</a>' : '') +
            (member.phone ? '<a href="tel:' + esc(member.phone) + '" class="btn btn-outline" style="flex:1;"><i data-feather="phone"></i>Call</a>' : '') +
            (member.phone ? '<a href="https://wa.me/' + this.cleanPhone(member.phone) + '" target="_blank" rel="noopener" class="btn btn-success" style="flex:1;"><i data-feather="message-circle"></i>WhatsApp</a>' : '') +
            '</div>' +

            '</div></div>';

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        if (typeof feather !== 'undefined') feather.replace();
        if (typeof App !== 'undefined' && App.fixIconSizes) setTimeout(function() { App.fixIconSizes(); }, 100);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });

        var escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    // ============================================================
    // BIRTHDAY CHECKER - ONLY FROM club_members TABLE
    // ============================================================
    checkBirthdays: function() {
        if (typeof supabaseAdmin === 'undefined') return;

        var now = new Date();
        var today = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        if (this.lastBirthdayCheck === today) return;
        this.lastBirthdayCheck = today;

        // Read from club_members - NOT users
        supabaseAdmin.from('club_members')
            .select('id, full_name, email, date_of_birth, portfolio')
            .eq('is_active', true)
            .not('date_of_birth', 'is', null)
            .then(function(result) {
                var data = result.data || [];
                if (!data.length) return;

                var birthdaysToday = data.filter(function(u) {
                    if (!u.date_of_birth) return false;
                    var dob = new Date(u.date_of_birth);
                    var dobMD = String(dob.getMonth() + 1).padStart(2, '0') + '-' + String(dob.getDate()).padStart(2, '0');
                    return dobMD === today;
                });

                if (birthdaysToday.length === 0) return;

                // Check if already sent today
                var todayFullDate = now.toISOString().split('T')[0];
                supabaseAdmin.from('mail_queue')
                    .select('id, recipients')
                    .eq('mail_type', 'birthday_wish')
                    .gte('created_at', todayFullDate + 'T00:00:00.000Z')
                    .then(function(mailResult) {
                        var alreadySent = {};
                        (mailResult.data || []).forEach(function(m) { alreadySent[m.recipients] = true; });

                        birthdaysToday.forEach(function(person) {
                            if (!person.email || alreadySent[person.email]) return;
                            if (typeof Mail !== 'undefined' && Mail.sendBirthdayWish) {
                                Mail.sendBirthdayWish(person);
                            }
                        });
                    });

                console.log('Birthday check: ' + birthdaysToday.length + ' birthday(s) today');
            }).catch(function(err) {
                console.warn('Birthday check error:', err);
            });
    },

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    getInitials: function(name) {
        if (!name) return '?';
        var parts = String(name).trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    isBirthdayToday: function(dob) {
        if (!dob) return false;
        try {
            var date = new Date(dob);
            var now = new Date();
            return date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
        } catch(e) { return false; }
    },

    getDaysUntilBirthday: function(dob) {
        if (!dob) return null;
        try {
            var now = new Date();
            var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var birth = new Date(dob);
            var nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());

            if (nextBirthday < today) {
                nextBirthday = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());
            }

            var diffTime = nextBirthday - today;
            return Math.round(diffTime / (1000 * 60 * 60 * 24));
        } catch(e) { return null; }
    },

    formatDaysAway: function(days) {
        if (days === 0) return 'Today!';
        if (days === 1) return 'Tomorrow';
        if (days <= 7) return 'In ' + days + ' days';
        if (days <= 30) return 'In ' + days + ' days';
        return '';
    },

    formatBirthday: function(dob) {
        if (!dob) return '';
        try {
            return new Date(dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
        } catch(e) { return dob; }
    },

    formatDate: function(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch(e) { return dateStr; }
    },

    cleanPhone: function(phone) {
        if (!phone) return '';
        var cleaned = String(phone).replace(/\D/g, '');
        if (cleaned.length === 10) cleaned = '91' + cleaned;
        return cleaned;
    }
};

// ============================================================
// AUTO INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof Members !== 'undefined' && !Members.initialized) {
            Members.init();
        }
    }, 500);
});

window.Members = Members;