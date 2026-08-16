/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Blood Request Handler - js/blood-request.js
   Public form + WhatsApp alert
   ============================================================ */

(function () {
    'use strict';

    const db = window.UnityAdminDB || window.UnityDB;

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 400); }, 4500);
    }

    // ============================================================
    // BLOOD REQUEST FORM HANDLER
    // ============================================================
    function initBloodRequestForm() {
        const form = document.getElementById('blood-request-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }

            const formData = new FormData(form);

            const requestData = {
                requester_name: formData.get('requester_name')?.trim(),
                requester_phone: formData.get('requester_phone')?.trim(),
                requester_email: formData.get('requester_email')?.trim() || null,
                patient_name: formData.get('patient_name')?.trim() || null,
                blood_group: formData.get('blood_group'),
                units_required: parseInt(formData.get('units_required')) || 1,
                hospital_name: formData.get('hospital_name')?.trim() || null,
                hospital_address: formData.get('hospital_address')?.trim() || null,
                required_by: formData.get('required_by') || null,
                urgency: formData.get('urgency') || 'normal',
                status: 'active',
                whatsapp_sent: false
            };

            // Validate required fields
            if (!requestData.requester_name || !requestData.requester_phone || !requestData.blood_group) {
                showToast('Please fill all required fields', 'warning');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Blood Request';
                }
                return;
            }

            try {
                // Save to database
                const { data, error } = await db.from('blood_requests').insert(requestData).select().single();
                if (error) throw error;

                // Send WhatsApp alerts
                let whatsappSent = false;
                try {
                    await sendBloodRequestWhatsApp(requestData, data.id);
                    whatsappSent = true;

                    // Update whatsapp_sent status
                    await db.from('blood_requests').update({ whatsapp_sent: true }).eq('id', data.id);
                } catch (waErr) {
                    console.warn('WhatsApp alert failed:', waErr);
                }

                form.reset();
                showToast(
                    whatsappSent
                        ? 'Blood request submitted! Emergency alert sent to blood donor coordinators.'
                        : 'Blood request submitted! Our team will contact donors shortly.',
                    'success'
                );

                // Show confirmation modal/message
                showBloodRequestConfirmation(requestData);

            } catch (err) {
                console.error('Blood request error:', err);
                showToast('Failed to submit blood request. Please try again or call directly.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Blood Request';
                }
            }
        });
    }

    // ============================================================
    // SEND WHATSAPP ALERT
    // ============================================================
    async function sendBloodRequestWhatsApp(data, requestId) {
        const settings = await window.UnitySettings?.get() || {};
        const emergency1 = settings.whatsapp_emergency_1 || '9789903206';
        const emergency2 = settings.whatsapp_emergency_2 || '9789953206';

        const urgencyEmoji = data.urgency === 'critical' ? '🆘 CRITICAL EMERGENCY' :
            data.urgency === 'urgent' ? '⚠️ URGENT' : 'ℹ️ Blood Request';

        const message = encodeURIComponent(
            `${urgencyEmoji} - BLOOD REQUEST\n\n` +
            `Blood Group: ${data.blood_group}\n` +
            `Units Required: ${data.units_required}\n` +
            `Patient: ${data.patient_name || 'Not specified'}\n` +
            `Hospital: ${data.hospital_name || 'Not specified'}\n` +
            `${data.hospital_address ? 'Address: ' + data.hospital_address + '\n' : ''}` +
            `${data.required_by ? 'Required By: ' + data.required_by + '\n' : ''}` +
            `\nContact Person: ${data.requester_name}\n` +
            `Phone: ${data.requester_phone}\n` +
            `\nRequest ID: #${requestId?.slice(-8).toUpperCase()}\n` +
            `Submitted via Rotaract Club of Coimbatore Unity Portal\n` +
            `Time: ${new Date().toLocaleString('en-IN')}`
        );

        // Open WhatsApp links for both numbers
        // Primary emergency contact
        window.open(`https://wa.me/91${emergency1}?text=${message}`, '_blank');

        // Secondary emergency contact (with delay)
        setTimeout(() => {
            window.open(`https://wa.me/91${emergency2}?text=${message}`, '_blank');
        }, 1000);

        return true;
    }

    // ============================================================
    // BLOOD REQUEST CONFIRMATION UI
    // ============================================================
    function showBloodRequestConfirmation(data) {
        const existingModal = document.getElementById('blood-confirm-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'blood-confirm-modal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);
            display:flex;align-items:center;justify-content:center;padding:20px;
            backdrop-filter:blur(4px);animation:fadeIn 0.3s ease;
        `;

        const urgencyColor = data.urgency === 'critical' ? '#ef4444' :
            data.urgency === 'urgent' ? '#f59e0b' : '#10b981';

        modal.innerHTML = `
            <div style="
                background:var(--bg-card,#fff);border-radius:16px;max-width:480px;width:100%;
                padding:36px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);
                animation:bounceIn 0.5s ease;
            ">
                <div style="
                    width:72px;height:72px;border-radius:50%;background:${urgencyColor}15;
                    display:flex;align-items:center;justify-content:center;margin:0 auto 16px;
                    border:3px solid ${urgencyColor};
                ">
                    <i class="fas fa-heartbeat" style="font-size:1.8rem;color:${urgencyColor};animation:pulse 1.5s ease-in-out infinite;"></i>
                </div>
                <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:8px;color:var(--text,#1a1a2e);">
                    Request Submitted!
                </h2>
                <p style="color:var(--text-secondary,#4a5568);font-size:0.9rem;margin-bottom:20px;line-height:1.6;">
                    Your blood request for <strong>${data.blood_group}</strong> has been submitted.
                    Emergency alerts have been sent to our blood donor coordinators via WhatsApp.
                </p>

                <div style="background:var(--bg-alt,#f0f4ff);border-radius:10px;padding:16px;margin-bottom:20px;text-align:left;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.82rem;">
                        <div>
                            <span style="color:var(--text-muted,#718096);display:block;font-size:0.7rem;font-weight:600;text-transform:uppercase;">Blood Group</span>
                            <strong style="color:${urgencyColor};font-size:1.1rem;">${data.blood_group}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted,#718096);display:block;font-size:0.7rem;font-weight:600;text-transform:uppercase;">Units</span>
                            <strong>${data.units_required}</strong>
                        </div>
                        ${data.hospital_name ? `
                        <div style="grid-column:1/-1;">
                            <span style="color:var(--text-muted,#718096);display:block;font-size:0.7rem;font-weight:600;text-transform:uppercase;">Hospital</span>
                            <strong>${data.hospital_name}</strong>
                        </div>` : ''}
                        <div>
                            <span style="color:var(--text-muted,#718096);display:block;font-size:0.7rem;font-weight:600;text-transform:uppercase;">Urgency</span>
                            <span style="
                                padding:3px 10px;border-radius:50px;font-size:0.72rem;font-weight:700;
                                background:${urgencyColor}15;color:${urgencyColor};
                            ">${data.urgency.toUpperCase()}</span>
                        </div>
                        <div>
                            <span style="color:var(--text-muted,#718096);display:block;font-size:0.7rem;font-weight:600;text-transform:uppercase;">Contact</span>
                            <strong>${data.requester_phone}</strong>
                        </div>
                    </div>
                </div>

                <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px;margin-bottom:20px;font-size:0.82rem;color:var(--text-secondary,#4a5568);">
                    <i class="fas fa-info-circle" style="color:#ef4444;margin-right:6px;"></i>
                    Our blood donor coordinators have been alerted. They will contact you shortly.
                    Please keep your phone accessible.
                </div>

                <button onclick="document.getElementById('blood-confirm-modal').remove();" style="
                    width:100%;padding:13px;background:#1a56db;color:white;border:none;
                    border-radius:10px;font-family:'Poppins',sans-serif;font-weight:700;
                    font-size:0.95rem;cursor:pointer;transition:all 0.2s ease;
                ">
                    <i class="fas fa-check"></i> Understood, Thank You!
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Auto-close after 15 seconds
        setTimeout(() => {
            if (document.getElementById('blood-confirm-modal')) {
                modal.remove();
            }
        }, 15000);
    }

    // ============================================================
    // BLOOD GROUP BADGE ANIMATION
    // ============================================================
    function initBloodGroupBadges() {
        const badges = document.querySelectorAll('.blood-group-badge');
        badges.forEach((badge, i) => {
            badge.style.animationDelay = `${i * 0.1}s`;
            badge.style.animation = 'bloodBadgePulse 3s ease-in-out infinite';

            // Add hover glow
            badge.addEventListener('mouseenter', () => {
                badge.style.background = 'var(--danger)';
                badge.style.color = 'white';
                badge.style.transform = 'scale(1.15)';
                badge.style.boxShadow = '0 4px 15px rgba(239,68,68,0.4)';
            });

            badge.addEventListener('mouseleave', () => {
                badge.style.background = '';
                badge.style.color = '';
                badge.style.transform = '';
                badge.style.boxShadow = '';
            });
        });

        // Add animation
        if (!document.getElementById('blood-badge-style')) {
            const style = document.createElement('style');
            style.id = 'blood-badge-style';
            style.textContent = `
                @keyframes bloodBadgePulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
                    50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.6); opacity: 0; }
                    70% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    15% { transform: scale(1.15); }
                    30% { transform: scale(1); }
                    45% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ============================================================
    // INITIALIZE ON DOM READY
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        initBloodRequestForm();
        initBloodGroupBadges();
    });

    console.log('%c BloodRequest.js loaded ', 'background:#ef4444;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();