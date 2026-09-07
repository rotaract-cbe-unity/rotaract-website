/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - BLOOD REQUEST MODULE
   ============================================================ */

const Blood = {
    initialized: false,
    emergencyPhones: ['9789903206', '9789953206'],

    compatibility: {
        'A+': { canReceiveFrom: ['A+', 'A-', 'O+', 'O-'], canDonateTo: ['A+', 'AB+'] },
        'A-': { canReceiveFrom: ['A-', 'O-'], canDonateTo: ['A+', 'A-', 'AB+', 'AB-'] },
        'B+': { canReceiveFrom: ['B+', 'B-', 'O+', 'O-'], canDonateTo: ['B+', 'AB+'] },
        'B-': { canReceiveFrom: ['B-', 'O-'], canDonateTo: ['B+', 'B-', 'AB+', 'AB-'] },
        'AB+': { canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], canDonateTo: ['AB+'] },
        'AB-': { canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'], canDonateTo: ['AB+', 'AB-'] },
        'O+': { canReceiveFrom: ['O+', 'O-'], canDonateTo: ['A+', 'B+', 'AB+', 'O+'] },
        'O-': { canReceiveFrom: ['O-'], canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }
    },

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.loadEmergencyPhones();
        this.bindEvents();
    },

    async loadEmergencyPhones() {
        try {
            if (typeof App !== 'undefined' && App.settings) {
                if (App.settings.whatsapp_emergency_1) this.emergencyPhones[0] = App.settings.whatsapp_emergency_1;
                if (App.settings.whatsapp_emergency_2) this.emergencyPhones[1] = App.settings.whatsapp_emergency_2;
            }
        } catch (err) { console.warn(err); }
    },

    bindEvents() {
        var form = document.getElementById('bloodRequestForm');
        if (form) form.addEventListener('submit', function(e) { Blood.submitRequest(e); });
    },

    async submitRequest(e) {
        e.preventDefault();
        var form = e.target;
        var btn = form.querySelector('button[type="submit"]');
        var original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader"></i>Submitting...';
        if (typeof feather !== 'undefined') feather.replace();

        try {
            var fd = new FormData(form);
            var payload = {
                patient_name: fd.get('patient_name'),
                blood_group: fd.get('blood_group'),
                units_needed: parseInt(fd.get('units_needed')) || 1,
                hospital: fd.get('hospital'),
                location: fd.get('location') || null,
                contact_name: fd.get('contact_name'),
                contact_phone: fd.get('contact_phone'),
                urgency: fd.get('urgency'),
                additional_notes: fd.get('additional_notes') || null,
                status: 'active'
            };

            var result = await supabaseAdmin.from('blood_requests').insert(payload).select().single();
            if (result.error) throw result.error;

            this.triggerWhatsAppAlert(payload);

            if (typeof Mail !== 'undefined' && Mail.sendBloodRequestNotification) {
                Mail.sendBloodRequestNotification(payload);
            }

            if (typeof App !== 'undefined') {
                App.toast('Blood request submitted! Emergency contacts notified via WhatsApp.', 'success', 5000);
                App.logActivity('blood_request_submitted', { blood_group: payload.blood_group });
            }

            form.reset();
        } catch (err) {
            console.error(err);
            if (typeof App !== 'undefined') App.toast('Failed: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    triggerWhatsAppAlert(request) {
        try {
            var compat = this.compatibility[request.blood_group];
            var compatGroups = compat ? compat.canReceiveFrom.join(', ') : request.blood_group;

            var message = 'URGENT BLOOD REQUEST\n\n' +
                'Patient: ' + request.patient_name + '\n' +
                'Blood Group: ' + request.blood_group + ' (Also accepts: ' + compatGroups + ')\n' +
                'Units: ' + request.units_needed + '\n' +
                'Hospital: ' + request.hospital + '\n' +
                (request.location ? 'Location: ' + request.location + '\n' : '') +
                'Contact: ' + request.contact_name + ' - ' + request.contact_phone + '\n' +
                'Urgency: ' + this.formatUrgency(request.urgency) + '\n\n' +
                '- Rotaract Club of Coimbatore Unity';

            var encoded = encodeURIComponent(message);
            window.open('https://wa.me/91' + this.emergencyPhones[0] + '?text=' + encoded, '_blank');

            setTimeout(function() {
                window.open('https://wa.me/91' + Blood.emergencyPhones[1] + '?text=' + encoded, '_blank');
            }, 1500);
        } catch (err) {
            console.error('WhatsApp error:', err);
        }
    },

    async loadBloodRequestsAdmin() {
        var tbody = document.getElementById('bloodTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8"><div class="inline-loader">Loading...</div></td></tr>';

        try {
            var result = await supabaseAdmin.from('blood_requests').select('*').order('created_at', { ascending: false });
            if (result.error) throw result.error;
            var data = result.data;

            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="8"><div class="empty-table"><i data-feather="droplet"></i><p>No blood requests</p></div></td></tr>';
                if (typeof feather !== 'undefined') feather.replace();
                if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) Auth.fixAdminIconSizes();
                return;
            }

            tbody.innerHTML = data.map(function(r) {
                return '<tr>' +
                    '<td><strong>' + (typeof App !== 'undefined' ? App.esc(r.patient_name) : r.patient_name) + '</strong></td>' +
                    '<td><span style="padding:0.4rem 0.85rem;background:var(--gradient-danger);color:white;border-radius:8px;font-weight:800;">' + r.blood_group + '</span></td>' +
                    '<td><strong>' + r.units_needed + '</strong></td>' +
                    '<td>' + (typeof App !== 'undefined' ? App.esc(r.hospital) : r.hospital) + '</td>' +
                    '<td>' + (typeof App !== 'undefined' ? App.esc(r.contact_name) : r.contact_name) + '<br><small>' + r.contact_phone + '</small></td>' +
                    '<td><span class="status-badge status-' + (r.urgency === 'urgent' ? 'rejected' : 'pending') + '">' + Blood.formatUrgency(r.urgency) + '</span></td>' +
                    '<td><span class="status-badge status-' + (r.status === 'active' ? 'approved' : r.status === 'resolved' ? 'completed' : 'inactive') + '">' + r.status + '</span></td>' +
                    '<td><div class="table-actions">' +
                        '<button class="table-action-btn approve" onclick="Blood.callContact(\'' + r.contact_phone + '\')" title="Call"><i data-feather="phone"></i></button>' +
                        '<button class="table-action-btn download" onclick="Blood.whatsappContact(\'' + r.contact_phone + '\',\'' + r.contact_name + '\')" title="WhatsApp"><i data-feather="message-circle"></i></button>' +
                        (r.status === 'active' ? '<button class="table-action-btn approve" onclick="Blood.markResolved(\'' + r.id + '\')" title="Resolve"><i data-feather="check"></i></button>' : '') +
                        '<button class="table-action-btn delete" onclick="Blood.deleteRequest(\'' + r.id + '\')" title="Delete"><i data-feather="trash-2"></i></button>' +
                    '</div></td>' +
                '</tr>';
            }).join('');

            if (typeof feather !== 'undefined') feather.replace();
            if (typeof Auth !== 'undefined' && Auth.fixAdminIconSizes) setTimeout(function() { Auth.fixAdminIconSizes(); }, 100);
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-table"><p>Error loading</p></div></td></tr>';
        }
    },

    callContact(phone) {
        if (phone) window.location.href = 'tel:' + phone;
    },

    whatsappContact(phone, name) {
        if (!phone) return;
        var cleaned = String(phone).replace(/\D/g, '');
        var withCode = cleaned.length === 10 ? '91' + cleaned : cleaned;
        var msg = encodeURIComponent('Hello ' + (name || '') + ', regarding your blood request...');
        window.open('https://wa.me/' + withCode + '?text=' + msg, '_blank');
    },

    async markResolved(id) {
        if (typeof App !== 'undefined' && App.confirm) {
            App.confirm('Mark as resolved?', async function() {
                await supabaseAdmin.from('blood_requests').update({ status: 'resolved' }).eq('id', id);
                App.toast('Resolved', 'success');
                Blood.loadBloodRequestsAdmin();
            });
        }
    },

    async deleteRequest(id) {
        if (typeof App !== 'undefined' && App.confirm) {
            App.confirm('Delete this request?', async function() {
                await supabaseAdmin.from('blood_requests').delete().eq('id', id);
                App.toast('Deleted', 'success');
                Blood.loadBloodRequestsAdmin();
            });
        }
    },

    async findDonors(bloodGroup) {
        try {
            var compat = this.compatibility[bloodGroup];
            if (!compat) return [];
            var result = await supabaseAdmin.from('club_members').select('full_name, phone, email, blood_group').in('blood_group', compat.canReceiveFrom).eq('is_active', true);
            return result.data || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    },

    async getStats() {
        try {
            var result = await supabaseAdmin.from('blood_requests').select('*');
            var data = result.data || [];
            return {
                total: data.length,
                active: data.filter(function(r) { return r.status === 'active'; }).length,
                resolved: data.filter(function(r) { return r.status === 'resolved'; }).length,
                cancelled: data.filter(function(r) { return r.status === 'cancelled'; }).length
            };
        } catch (err) {
            return { total: 0, active: 0, resolved: 0, cancelled: 0 };
        }
    },

    formatUrgency(urgency) {
        var labels = { urgent: 'URGENT', within_24hrs: 'Within 24 Hours', within_48hrs: 'Within 48 Hours', scheduled: 'Scheduled' };
        return labels[urgency] || urgency;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { Blood.init(); }, 500);
});

window.Blood = Blood;