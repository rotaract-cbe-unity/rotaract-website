/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   Treasury Management - js/treasury.js
   ============================================================ */

(function () {
    'use strict';

    const db = window.UnityAdminDB || window.UnityDB;
    const auth = window.UnityAuth;
    const cfg = window.UnityConfig;

    function esc(t) { return auth.escHtml(t); }
    function fDate(d) { return auth.formatDate(d); }
    function toast(m, t) { auth.showAdminToast(m, t); }

    function buildTableLoading(cols) {
        return `<tr><td colspan="${cols}" class="table-loading">
            <div class="line-placeholder"></div>
            <div class="line-placeholder w-3-4"></div>
        </td></tr>`;
    }

    function buildEmptyRow(cols, msg = 'No records found') {
        return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--a-text3);">
            <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--a-border);"></i>${msg}
        </td></tr>`;
    }

    function formatINR(amount) {
        return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    let treasuryChart = null;

    // ============================================================
    // ADMIN TREASURY MODULE
    // ============================================================
    window.AdminTreasury = {
        data: [],
        filteredData: [],
        currentPage: 0,
        perPage: 50,

        async load() {
            if (!auth.hasPermission('canViewTreasury')) {
                document.getElementById('treasury-table-body').innerHTML =
                    buildEmptyRow(10, 'You do not have treasury access');
                return;
            }
            this.bindFilters();
            await this.fetchAndRender();
            await this.loadSummary();
            this.initChart();
        },

        bindFilters() {
            document.getElementById('treasury-filter-btn')?.addEventListener('click', () => {
                this.applyFilters();
            });
            document.getElementById('treasury-filter-type')?.addEventListener('change', () => {
                this.applyFilters();
            });
        },

        async fetchAndRender() {
            const tbody = document.getElementById('treasury-table-body');
            if (!tbody) return;
            tbody.innerHTML = buildTableLoading(10);

            try {
                const { data, error } = await db
                    .from('treasury_transactions')
                    .select('*, projects(title)')
                    .order('date', { ascending: true })
                    .order('created_at', { ascending: true });

                if (error) throw error;

                // Recalculate running balance
                let runningBalance = 0;
                this.data = (data || []).map((t, i) => {
                    if (t.transaction_type === 'income') {
                        runningBalance += parseFloat(t.amount);
                    } else {
                        runningBalance -= parseFloat(t.amount);
                    }
                    return { ...t, computed_balance: runningBalance, sno: i + 1 };
                });

                this.filteredData = [...this.data];
                this.render();
                await this.loadSummary();
                this.updateChart();
            } catch (e) {
                tbody.innerHTML = buildEmptyRow(10, 'Could not load transactions');
                toast('Failed to load treasury data', 'error');
            }
        },

        applyFilters() {
            const type = document.getElementById('treasury-filter-type')?.value;
            const from = document.getElementById('treasury-date-from')?.value;
            const to = document.getElementById('treasury-date-to')?.value;
            const status = document.getElementById('treasury-filter-status')?.value;

            this.filteredData = this.data.filter(t => {
                if (type && t.transaction_type !== type) return false;
                if (from && t.date < from) return false;
                if (to && t.date > to) return false;
                if (status !== '' && status !== undefined) {
                    if (status === 'true' && !t.is_approved) return false;
                    if (status === 'false' && t.is_approved) return false;
                }
                return true;
            });

            this.render();
        },

        render() {
            const tbody = document.getElementById('treasury-table-body');
            if (!tbody) return;

            const canEdit = auth.hasPermission('canEditTreasury');
            const canApprove = auth.isTreasurer() || auth.isHighLevel();

            if (!this.filteredData.length) {
                tbody.innerHTML = buildEmptyRow(10, 'No transactions found');
                return;
            }

            tbody.innerHTML = this.filteredData.map(t => `
                <tr>
                    <td><strong>${t.sno}</strong></td>
                    <td>
                        <div style="font-size:0.82rem;font-weight:600;">${fDate(t.date)}</div>
                    </td>
                    <td>
                        <div class="cell-name">${esc(t.particular)}</div>
                        ${t.projects?.title ? `<div class="cell-sub"><i class="fas fa-calendar-alt" style="font-size:0.6rem;"></i> ${esc(t.projects.title)}</div>` : ''}
                        ${t.reference_number ? `<div class="cell-sub">Ref: ${esc(t.reference_number)}</div>` : ''}
                        ${t.notes ? `<div class="cell-sub" style="font-style:italic;">${esc(t.notes)}</div>` : ''}
                    </td>
                    <td>
                        ${t.category ? `<span class="badge badge-gray">${esc(t.category)}</span>` : '—'}
                    </td>
                    <td>
                        ${t.payment_mode ? `<span class="badge badge-info">${esc(t.payment_mode.replace('_', ' '))}</span>` : '—'}
                    </td>
                    <td class="treasury-income-cell">
                        ${t.transaction_type === 'income' ? formatINR(t.amount) : '—'}
                    </td>
                    <td class="treasury-expense-cell">
                        ${t.transaction_type === 'expense' ? formatINR(t.amount) : '—'}
                    </td>
                    <td class="${t.computed_balance >= 0 ? 'treasury-balance-positive' : 'treasury-balance-negative'}">
                        ${formatINR(t.computed_balance)}
                    </td>
                    <td>
                        <span class="badge badge-${t.is_approved ? 'success' : 'warning'}">
                            <i class="fas fa-${t.is_approved ? 'check' : 'clock'}"></i>
                            ${t.is_approved ? 'Approved' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <div class="cell-actions">
                            ${t.receipt_url ? `
                            <button class="action-btn view" title="View Receipt"
                                onclick="document.getElementById('image-preview-overlay').style.display='flex';document.getElementById('image-preview-img').src='${esc(t.receipt_url)}';">
                                <i class="fas fa-receipt"></i>
                            </button>` : ''}
                            ${canEdit ? `
                            <button class="action-btn edit" title="Edit" onclick="AdminTreasury.openEdit('${t.id}')">
                                <i class="fas fa-edit"></i>
                            </button>` : ''}
                            ${!t.is_approved && canApprove ? `
                            <button class="action-btn approve" title="Approve" onclick="AdminTreasury.approveTransaction('${t.id}')">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                            ${canEdit ? `
                            <button class="action-btn delete" title="Delete" onclick="AdminTreasury.confirmDelete('${t.id}')">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        async loadSummary() {
            const approved = this.data.filter(t => t.is_approved);
            const pending = this.data.filter(t => !t.is_approved);

            const totalIncome = approved.filter(t => t.transaction_type === 'income')
                .reduce((s, t) => s + parseFloat(t.amount), 0);
            const totalExpense = approved.filter(t => t.transaction_type === 'expense')
                .reduce((s, t) => s + parseFloat(t.amount), 0);
            const balance = totalIncome - totalExpense;

            const incomeEl = document.getElementById('total-income');
            const expenseEl = document.getElementById('total-expense');
            const balanceEl = document.getElementById('current-balance');
            const pendingEl = document.getElementById('pending-transactions');

            if (incomeEl) incomeEl.textContent = formatINR(totalIncome);
            if (expenseEl) expenseEl.textContent = formatINR(totalExpense);
            if (balanceEl) {
                balanceEl.textContent = formatINR(balance);
                balanceEl.style.color = balance >= 0 ? 'var(--a-success)' : 'var(--a-danger)';
            }
            if (pendingEl) pendingEl.textContent = pending.length;
        },

        initChart() {
            const canvas = document.getElementById('treasury-chart');
            if (!canvas || !window.Chart) return;

            const ctx = canvas.getContext('2d');

            // Get monthly data
            const monthlyData = this.getMonthlyData();

            if (treasuryChart) treasuryChart.destroy();

            treasuryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: monthlyData.labels,
                    datasets: [
                        {
                            label: 'Income',
                            data: monthlyData.income,
                            backgroundColor: 'rgba(16, 185, 129, 0.6)',
                            borderColor: 'rgba(16, 185, 129, 1)',
                            borderWidth: 2,
                            borderRadius: 6
                        },
                        {
                            label: 'Expense',
                            data: monthlyData.expenses,
                            backgroundColor: 'rgba(239, 68, 68, 0.6)',
                            borderColor: 'rgba(239, 68, 68, 1)',
                            borderWidth: 2,
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: { family: 'Poppins', size: 12 },
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--a-text').trim()
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { family: 'Poppins', size: 11 },
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--a-text3').trim()
                            }
                        },
                        y: {
                            grid: {
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--a-border').trim()
                            },
                            ticks: {
                                font: { family: 'Poppins', size: 11 },
                                color: getComputedStyle(document.documentElement)
                                    .getPropertyValue('--a-text3').trim(),
                                callback: (val) => '₹' + val.toLocaleString('en-IN')
                            }
                        }
                    }
                }
            });
        },

        updateChart() {
            if (!treasuryChart) { this.initChart(); return; }
            const monthlyData = this.getMonthlyData();
            treasuryChart.data.labels = monthlyData.labels;
            treasuryChart.data.datasets[0].data = monthlyData.income;
            treasuryChart.data.datasets[1].data = monthlyData.expenses;
            treasuryChart.update();
        },

        getMonthlyData() {
            const months = {};
            this.data.filter(t => t.is_approved).forEach(t => {
                const d = new Date(t.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!months[key]) months[key] = { income: 0, expenses: 0 };
                if (t.transaction_type === 'income') {
                    months[key].income += parseFloat(t.amount);
                } else {
                    months[key].expenses += parseFloat(t.amount);
                }
            });

            const sorted = Object.keys(months).sort();
            const last6 = sorted.slice(-6);

            return {
                labels: last6.map(k => {
                    const [yr, mo] = k.split('-');
                    return new Date(yr, parseInt(mo) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                }),
                income: last6.map(k => months[k].income),
                expenses: last6.map(k => months[k].expenses)
            };
        },

        // ============================================================
        // ADD TRANSACTION FORM
        // ============================================================
        openAddTransaction(type) {
            const isIncome = type === 'income';

            auth.openModal(
                `<i class="fas fa-${isIncome ? 'arrow-down' : 'arrow-up'}" style="color:var(--a-${isIncome ? 'success' : 'danger'});"></i> Add ${isIncome ? 'Income' : 'Expense'}`,
                `<div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label>Particular / Description <span class="req">*</span></label>
                        <input type="text" id="tr-particular" placeholder="e.g. Club Registration Fee" required>
                    </div>
                    <div class="form-group">
                        <label>Amount (₹) <span class="req">*</span></label>
                        <input type="number" id="tr-amount" min="0.01" step="0.01" placeholder="0.00" required>
                    </div>
                    <div class="form-group">
                        <label>Date <span class="req">*</span></label>
                        <input type="date" id="tr-date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="tr-category">
                            <option value="">Select Category</option>
                            ${isIncome ? `
                            <option>Membership Fee</option>
                            <option>Registration Fee</option>
                            <option>Sponsorship</option>
                            <option>Donation</option>
                            <option>Event Income</option>
                            <option>Grant</option>
                            <option>Other Income</option>
                            ` : `
                            <option>Event Expense</option>
                            <option>Venue Expense</option>
                            <option>Refreshments</option>
                            <option>Printing</option>
                            <option>Transportation</option>
                            <option>Gifts & Awards</option>
                            <option>Administrative</option>
                            <option>District Fee</option>
                            <option>Other Expense</option>
                            `}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <select id="tr-payment-mode">
                            <option value="">Select Mode</option>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="upi">UPI</option>
                            <option value="cheque">Cheque</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Reference Number</label>
                        <input type="text" id="tr-ref" placeholder="Cheque/Transaction number">
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea id="tr-notes" rows="2" placeholder="Additional notes..."></textarea>
                    </div>
                    <div class="form-group full-width">
                        <label>Receipt / Document</label>
                        <div class="modal-file-upload">
                            <i class="fas fa-receipt"></i>
                            <p>Upload receipt or document</p>
                            <span>JPG, PNG, PDF (Max 5MB)</span>
                            <input type="file" id="tr-receipt" accept="image/*,application/pdf">
                        </div>
                        <div id="tr-receipt-preview"></div>
                    </div>
                </div>`,
                async (close) => {
                    await this.saveTransaction(type, null, close);
                },
                {
                    saveLabel: `<i class="fas fa-save"></i> Add ${isIncome ? 'Income' : 'Expense'}`
                }
            );

            setTimeout(() => {
                document.getElementById('tr-receipt')?.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                            const p = document.getElementById('tr-receipt-preview');
                            if (p) p.innerHTML = `<img src="${ev.target.result}" style="max-height:80px;margin-top:8px;border-radius:6px;">`;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }, 200);
        },

        async openEdit(transactionId) {
            const t = this.data.find(x => x.id === transactionId);
            if (!t) return;

            const isIncome = t.transaction_type === 'income';

            auth.openModal(
                `<i class="fas fa-edit"></i> Edit Transaction`,
                `<div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label>Particular <span class="req">*</span></label>
                        <input type="text" id="etr-particular" value="${esc(t.particular)}" required>
                    </div>
                    <div class="form-group">
                        <label>Amount (₹) <span class="req">*</span></label>
                        <input type="number" id="etr-amount" value="${t.amount}" min="0.01" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Date <span class="req">*</span></label>
                        <input type="date" id="etr-date" value="${t.date}" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <input type="text" id="etr-category" value="${esc(t.category || '')}">
                    </div>
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <select id="etr-payment-mode">
                            <option value="">Select Mode</option>
                            <option value="cash" ${t.payment_mode === 'cash' ? 'selected' : ''}>Cash</option>
                            <option value="bank_transfer" ${t.payment_mode === 'bank_transfer' ? 'selected' : ''}>Bank Transfer</option>
                            <option value="upi" ${t.payment_mode === 'upi' ? 'selected' : ''}>UPI</option>
                            <option value="cheque" ${t.payment_mode === 'cheque' ? 'selected' : ''}>Cheque</option>
                            <option value="other" ${t.payment_mode === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Reference Number</label>
                        <input type="text" id="etr-ref" value="${esc(t.reference_number || '')}">
                    </div>
                    <div class="form-group full-width">
                        <label>Notes</label>
                        <textarea id="etr-notes" rows="2">${esc(t.notes || '')}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label>Status</label>
                        <select id="etr-approved">
                            <option value="true" ${t.is_approved ? 'selected' : ''}>Approved</option>
                            <option value="false" ${!t.is_approved ? 'selected' : ''}>Pending</option>
                        </select>
                    </div>
                </div>`,
                async (close) => {
                    const particular = document.getElementById('etr-particular')?.value.trim();
                    const amount = parseFloat(document.getElementById('etr-amount')?.value);
                    const date = document.getElementById('etr-date')?.value;

                    if (!particular || !amount || !date) {
                        toast('Particular, amount and date are required', 'warning');
                        return;
                    }

                    try {
                        await db.from('treasury_transactions').update({
                            particular,
                            amount,
                            date,
                            category: document.getElementById('etr-category')?.value.trim() || null,
                            payment_mode: document.getElementById('etr-payment-mode')?.value || null,
                            reference_number: document.getElementById('etr-ref')?.value.trim() || null,
                            notes: document.getElementById('etr-notes')?.value.trim() || null,
                            is_approved: document.getElementById('etr-approved')?.value === 'true'
                        }).eq('id', transactionId);

                        toast('Transaction updated!', 'success');
                        close();
                        await this.fetchAndRender();
                    } catch (e) {
                        toast('Failed to update transaction', 'error');
                    }
                }
            );
        },

        async saveTransaction(type, existingId, close) {
            const particular = document.getElementById('tr-particular')?.value.trim();
            const amount = parseFloat(document.getElementById('tr-amount')?.value);
            const date = document.getElementById('tr-date')?.value;

            if (!particular || !amount || isNaN(amount) || !date) {
                toast('Particular, amount and date are required', 'warning');
                return;
            }

            if (amount <= 0) {
                toast('Amount must be greater than 0', 'warning');
                return;
            }

            const user = auth.getCurrentUser();

            // Upload receipt
            let receiptUrl = null;
            const receiptFile = document.getElementById('tr-receipt')?.files[0];
            if (receiptFile) {
                try {
                    window.UnityStorage.checkFileSize(receiptFile);
                    let uploadFile = receiptFile;
                    if (receiptFile.type.startsWith('image/')) {
                        uploadFile = await window.UnityStorage.compressImage(receiptFile, 1200, 0.8);
                    }
                    const path = `receipt_${Date.now()}.${receiptFile.name.split('.').pop()}`;
                    receiptUrl = await window.UnityStorage.uploadFile('treasury', uploadFile, path);
                } catch (e) {
                    toast('Receipt upload failed: ' + e.message, 'warning');
                }
            }

            try {
                const isTreasurer = auth.isTreasurer();
                const isHighLevel = auth.isHighLevel();

                await db.from('treasury_transactions').insert({
                    transaction_type: type,
                    particular,
                    amount,
                    date,
                    category: document.getElementById('tr-category')?.value || null,
                    payment_mode: document.getElementById('tr-payment-mode')?.value || null,
                    reference_number: document.getElementById('tr-ref')?.value.trim() || null,
                    notes: document.getElementById('tr-notes')?.value.trim() || null,
                    receipt_url: receiptUrl,
                    uploaded_by: user?.id,
                    is_approved: isTreasurer || isHighLevel
                });

                toast(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
                close();
                await this.fetchAndRender();

                // Send monthly statement reminder if needed
                this.checkMonthlyStatementReminder();
            } catch (e) {
                toast('Failed to save transaction: ' + e.message, 'error');
            }
        },

        async approveTransaction(transactionId) {
            try {
                const user = auth.getCurrentUser();
                await db.from('treasury_transactions').update({
                    is_approved: true,
                    approved_by: user?.id
                }).eq('id', transactionId);

                toast('Transaction approved!', 'success');
                await this.fetchAndRender();
            } catch (e) {
                toast('Failed to approve transaction', 'error');
            }
        },

        async confirmDelete(transactionId) {
            auth.openConfirm('Delete Transaction', 'Permanently delete this transaction?', async () => {
                try {
                    await db.from('treasury_transactions').delete().eq('id', transactionId);
                    toast('Transaction deleted', 'success');
                    await this.fetchAndRender();
                } catch (e) {
                    toast('Failed to delete transaction', 'error');
                }
            });
        },

        // ============================================================
        // DOWNLOAD TREASURY STATEMENT (Excel)
        // ============================================================
        async downloadStatement() {
            if (!window.XLSX) {
                toast('Excel library not available', 'error');
                return;
            }

            const fromDate = document.getElementById('treasury-date-from')?.value;
            const toDate = document.getElementById('treasury-date-to')?.value;

            let data = this.data.filter(t => t.is_approved);
            if (fromDate) data = data.filter(t => t.date >= fromDate);
            if (toDate) data = data.filter(t => t.date <= toDate);

            if (!data.length) {
                toast('No approved transactions to export', 'warning');
                return;
            }

            const settings = await window.UnitySettings.get();
            const clubName = settings.club_name || 'Rotaract Club of Coimbatore Unity';
            const period = fromDate && toDate
                ? `${fDate(fromDate)} to ${fDate(toDate)}`
                : 'All Transactions';

            // Build Excel data
            const excelData = [];

            // Header rows
            excelData.push([clubName]);
            excelData.push(['Family of Rotary Club of Coimbatore East']);
            excelData.push([`Club ID: ${settings.club_id || '91594'} | ${settings.district_short || 'RI District 3206'}`]);
            excelData.push([`Treasury Statement - ${period}`]);
            excelData.push([]);
            excelData.push(['S.No', 'Date', 'Particular', 'Category', 'Payment Mode', 'Reference', 'Income (₹)', 'Expense (₹)', 'Balance (₹)', 'Status']);

            let sno = 1;
            data.forEach(t => {
                excelData.push([
                    sno++,
                    t.date,
                    t.particular,
                    t.category || '',
                    t.payment_mode || '',
                    t.reference_number || '',
                    t.transaction_type === 'income' ? parseFloat(t.amount) : '',
                    t.transaction_type === 'expense' ? parseFloat(t.amount) : '',
                    parseFloat(t.computed_balance || 0),
                    t.is_approved ? 'Approved' : 'Pending'
                ]);
            });

            // Summary rows
            const totalIncome = data.filter(t => t.transaction_type === 'income')
                .reduce((s, t) => s + parseFloat(t.amount), 0);
            const totalExpense = data.filter(t => t.transaction_type === 'expense')
                .reduce((s, t) => s + parseFloat(t.amount), 0);
            const balance = totalIncome - totalExpense;

            excelData.push([]);
            excelData.push(['', '', '', '', '', 'TOTAL', totalIncome, totalExpense, balance, '']);
            excelData.push([]);
            excelData.push(['', '', '', '', '', '', 'Net Balance:', balance >= 0 ? `Surplus: ₹${balance.toFixed(2)}` : `Deficit: ₹${Math.abs(balance).toFixed(2)}`, '', '']);
            excelData.push([]);
            excelData.push([`Generated on: ${new Date().toLocaleDateString('en-IN')}`]);

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Column widths
            ws['!cols'] = [
                { wch: 6 }, { wch: 14 }, { wch: 40 }, { wch: 18 },
                { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Treasury Statement');

            const fileName = `Unity_Treasury_${period.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast('Treasury statement downloaded!', 'success');

            // Log
            try {
                await db.from('email_logs').insert({
                    email_type: 'treasury_download',
                    recipient: auth.getCurrentUser()?.email,
                    subject: `Treasury Statement Downloaded - ${period}`,
                    status: 'info'
                });
            } catch (e) { }
        },

        checkMonthlyStatementReminder() {
            const today = new Date();
            if (today.getDate() === 1) {
                // First of month - trigger monthly statement
                if (window.AdminMail) {
                    window.AdminMail.sendMonthlyTreasuryStatement();
                }
            }
        }
    };

    // Button listeners
    document.getElementById('add-income-btn')?.addEventListener('click', () => {
        AdminTreasury.openAddTransaction('income');
    });

    document.getElementById('add-expense-btn')?.addEventListener('click', () => {
        AdminTreasury.openAddTransaction('expense');
    });

    document.getElementById('download-treasury-btn')?.addEventListener('click', () => {
        AdminTreasury.downloadStatement();
    });

    console.log('%c Treasury.js loaded ', 'background:#f59e0b;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();