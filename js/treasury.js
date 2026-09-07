/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - TREASURY MODULE
   Professional CA-Level Treasury Management
   Income/Expense Tracking | Excel Export | Auto Calculations
   ============================================================ */

const Treasury = {
    // ============================================================
    // CONFIGURATION
    // ============================================================
    initialized: false,
    editingId: null,
    currentTransactions: [],
    filteredTransactions: [],
    summary: {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        transactionCount: 0
    },
    filters: {
        fromDate: null,
        toDate: null,
        category: null
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
        // Add Transaction button
        const addBtn = document.getElementById('addTreasuryBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openForm());

        // Form close
        const closeBtn = document.getElementById('treasuryFormClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeForm());

        // Form submit
        const form = document.getElementById('treasuryForm');
        if (form) form.addEventListener('submit', (e) => this.saveTransaction(e));

        // Receipt preview
        const receiptInput = document.getElementById('receiptInput');
        if (receiptInput) {
            receiptInput.addEventListener('change', (e) => {
                const preview = document.getElementById('receiptPreview');
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    if (typeof App !== 'undefined') App.previewImage(file, preview);
                } else if (preview) {
                    preview.classList.add('hidden');
                }
            });
        }

        // Download Statement button
        const downloadBtn = document.getElementById('downloadTreasuryBtn');
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.openDownloadModal());

        // Download modal close
        const downloadClose = document.getElementById('treasuryDownloadClose');
        if (downloadClose) downloadClose.addEventListener('click', () => this.closeDownloadModal());

        // Download form submit
        const downloadForm = document.getElementById('treasuryDownloadForm');
        if (downloadForm) {
            downloadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const fromDate = document.getElementById('downloadFromDate').value;
                const toDate = document.getElementById('downloadToDate').value;
                this.downloadStatement(fromDate, toDate);
                this.closeDownloadModal();
            });
        }

        // Filter button
        const filterBtn = document.getElementById('treasuryFilterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                const fromDate = document.getElementById('treasuryFromDate').value;
                const toDate = document.getElementById('treasuryToDate').value;
                this.applyFilters(fromDate, toDate);
            });
        }

        // Set default date for new transaction (today)
        const dateInput = document.querySelector('#treasuryForm [name="transaction_date"]');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    },

    // ============================================================
    // LOAD TREASURY DATA
    // ============================================================
    async loadTreasury() {
        const tbody = document.getElementById('treasuryTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="8"><div class="inline-loader">Loading transactions...</div></td></tr>';

        try {
            let query = supabaseAdmin
                .from('treasury')
                .select('*')
                .order('transaction_date', { ascending: false })
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            this.currentTransactions = data || [];
            this.filteredTransactions = [...this.currentTransactions];

            this.calculateSummary();
            this.updateSummaryCards();
            this.renderTable();

        } catch (err) {
            console.error('Load treasury error:', err);
            tbody.innerHTML = `
                <tr><td colspan="8">
                    <div class="empty-table">
                        <i data-feather="alert-circle"></i>
                        <p>Error loading transactions</p>
                    </div>
                </td></tr>
            `;
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    // ============================================================
    // CALCULATE SUMMARY (with cumulative balance for each transaction)
    // ============================================================
    calculateSummary() {
        let totalIncome = 0;
        let totalExpense = 0;

        this.filteredTransactions.forEach(t => {
            totalIncome += parseFloat(t.income) || 0;
            totalExpense += parseFloat(t.expense) || 0;
        });

        this.summary = {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            transactionCount: this.filteredTransactions.length
        };
    },

    /**
     * Calculate running balance for each transaction
     * Older transactions first, then reverse to display newest first
     */
    calculateRunningBalances(transactions) {
        // Sort ascending by date for calculation
        const sorted = [...transactions].sort((a, b) => {
            const dateA = new Date(a.transaction_date + 'T' + (a.created_at || '00:00:00'));
            const dateB = new Date(b.transaction_date + 'T' + (b.created_at || '00:00:00'));
            return dateA - dateB;
        });

        let runningBalance = 0;
        sorted.forEach(t => {
            const income = parseFloat(t.income) || 0;
            const expense = parseFloat(t.expense) || 0;
            runningBalance += (income - expense);
            t._balance = runningBalance;
        });

        // Return with newest first for display
        return sorted.reverse();
    },

    updateSummaryCards() {
        const totalIncomeEl = document.getElementById('treasuryTotalIncome');
        const totalExpenseEl = document.getElementById('treasuryTotalExpense');
        const balanceEl = document.getElementById('treasuryBalance');

        if (totalIncomeEl) totalIncomeEl.textContent = this.formatCurrency(this.summary.totalIncome);
        if (totalExpenseEl) totalExpenseEl.textContent = this.formatCurrency(this.summary.totalExpense);
        if (balanceEl) {
            balanceEl.textContent = this.formatCurrency(this.summary.balance);
            // Color based on positive/negative
            balanceEl.style.color = this.summary.balance >= 0 ? 'var(--success)' : 'var(--danger)';
        }
    },

    // ============================================================
    // RENDER TABLE
    // ============================================================
    renderTable() {
        const tbody = document.getElementById('treasuryTableBody');
        if (!tbody) return;

        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8">
                    <div class="empty-table">
                        <i data-feather="dollar-sign"></i>
                        <p>No transactions yet</p>
                    </div>
                </td></tr>
            `;
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        // Calculate running balances
        const withBalances = this.calculateRunningBalances(this.filteredTransactions);

        tbody.innerHTML = withBalances.map((t, idx) => {
            const income = parseFloat(t.income) || 0;
            const expense = parseFloat(t.expense) || 0;
            const balance = t._balance || 0;

            return `
                <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td>${this.formatDate(t.transaction_date)}</td>
                    <td>
                        <strong>${this.esc(t.particular)}</strong>
                        ${t.notes ? `<br><small style="color: var(--text-muted);">${this.esc(t.notes)}</small>` : ''}
                    </td>
                    <td>
                        ${t.category ? `<span class="permission-tag">${this.esc(t.category)}</span>` : '-'}
                    </td>
                    <td class="text-right" style="color: ${income > 0 ? 'var(--success)' : 'inherit'}; font-weight: ${income > 0 ? '700' : '400'};">
                        ${income > 0 ? this.formatCurrency(income) : '-'}
                    </td>
                    <td class="text-right" style="color: ${expense > 0 ? 'var(--danger)' : 'inherit'}; font-weight: ${expense > 0 ? '700' : '400'};">
                        ${expense > 0 ? this.formatCurrency(expense) : '-'}
                    </td>
                    <td class="text-right" style="color: ${balance >= 0 ? 'var(--primary)' : 'var(--danger)'}; font-weight: 600;">
                        ${this.formatCurrency(balance)}
                    </td>
                    <td>
                        <div class="table-actions">
                            ${t.receipt_url ? `
                                <button class="table-action-btn view" onclick="Treasury.viewReceipt('${this.esc(t.receipt_url)}')" title="View Receipt">
                                    <i data-feather="file"></i>
                                </button>
                            ` : ''}
                            <button class="table-action-btn edit" onclick="Treasury.editTransaction('${t.id}')" title="Edit">
                                <i data-feather="edit-2"></i>
                            </button>
                            <button class="table-action-btn delete" onclick="Treasury.deleteTransaction('${t.id}')" title="Delete">
                                <i data-feather="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (typeof feather !== 'undefined') feather.replace();
    },

    // ============================================================
    // FILTERS
    // ============================================================
    applyFilters(fromDate, toDate) {
        this.filters.fromDate = fromDate;
        this.filters.toDate = toDate;

        this.filteredTransactions = this.currentTransactions.filter(t => {
            const tDate = t.transaction_date;
            if (fromDate && tDate < fromDate) return false;
            if (toDate && tDate > toDate) return false;
            return true;
        });

        this.calculateSummary();
        this.updateSummaryCards();
        this.renderTable();

        if (typeof App !== 'undefined') {
            App.toast(`Filtered: ${this.filteredTransactions.length} transaction(s)`, 'info');
        }
    },

    clearFilters() {
        this.filters = { fromDate: null, toDate: null, category: null };
        document.getElementById('treasuryFromDate').value = '';
        document.getElementById('treasuryToDate').value = '';
        this.filteredTransactions = [...this.currentTransactions];
        this.calculateSummary();
        this.updateSummaryCards();
        this.renderTable();
    },

    // ============================================================
    // FORM OPERATIONS
    // ============================================================
    openForm(transactionData = null) {
        const modal = document.getElementById('treasuryFormModal');
        const form = document.getElementById('treasuryForm');
        const title = document.getElementById('treasuryFormTitle');
        const preview = document.getElementById('receiptPreview');

        if (!modal || !form) return;

        form.reset();
        if (preview) preview.classList.add('hidden');
        this.editingId = null;

        if (transactionData) {
            this.editingId = transactionData.id;
            if (title) title.textContent = 'Edit Transaction';
            document.getElementById('treasuryFormId').value = transactionData.id;

            Object.keys(transactionData).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field && transactionData[key] !== null) {
                    field.value = transactionData[key];
                }
            });

            if (transactionData.receipt_url && preview) {
                preview.src = transactionData.receipt_url;
                preview.classList.remove('hidden');
            }
        } else {
            if (title) title.textContent = 'Add Transaction';
            // Set today's date as default
            const dateInput = form.querySelector('[name="transaction_date"]');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (typeof feather !== 'undefined') feather.replace();
    },

    closeForm() {
        const modal = document.getElementById('treasuryFormModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.editingId = null;
    },

    async editTransaction(id) {
        try {
            const { data, error } = await supabaseAdmin
                .from('treasury')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) this.openForm(data);
        } catch (err) {
            console.error('Edit transaction error:', err);
            if (typeof App !== 'undefined') App.toast('Failed to load transaction', 'error');
        }
    },

    async saveTransaction(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-feather="loader"></i>Saving...';
        if (typeof feather !== 'undefined') feather.replace();

        try {
            const formData = new FormData(form);
            const receiptFile = formData.get('receipt');

            const income = parseFloat(formData.get('income')) || 0;
            const expense = parseFloat(formData.get('expense')) || 0;

            // Validation
            if (income === 0 && expense === 0) {
                if (typeof App !== 'undefined') App.toast('Please enter income or expense amount', 'warning');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }

            if (income > 0 && expense > 0) {
                if (typeof App !== 'undefined') App.toast('Cannot have both income and expense in one transaction', 'warning');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }

            const payload = {
                transaction_date: formData.get('transaction_date'),
                particular: formData.get('particular'),
                category: formData.get('category') || null,
                income: income,
                expense: expense,
                notes: formData.get('notes') || null,
                created_by: Auth.currentUser?.id
            };

            // Upload receipt if provided
            if (receiptFile && receiptFile.size > 0) {
                try {
                    const upload = await App.uploadToCloudinary(receiptFile, 'receipts');
                    payload.receipt_url = upload.secure_url;
                    payload.receipt_public_id = upload.public_id;
                } catch (upErr) {
                    console.error('Receipt upload failed:', upErr);
                    if (typeof App !== 'undefined') App.toast('Receipt upload failed, saving without receipt', 'warning');
                }
            }

            let result;
            if (this.editingId) {
                result = await supabaseAdmin
                    .from('treasury')
                    .update(payload)
                    .eq('id', this.editingId);
            } else {
                result = await supabaseAdmin
                    .from('treasury')
                    .insert(payload);
            }

            if (result.error) throw result.error;

            if (typeof App !== 'undefined') {
                App.toast(
                    this.editingId ? 'Transaction updated successfully' : 'Transaction added successfully',
                    'success'
                );
                App.logActivity(
                    this.editingId ? 'treasury_updated' : 'treasury_created',
                    { particular: payload.particular, amount: income || expense }
                );
            }

            this.closeForm();
            this.loadTreasury();

            // Reload public treasury data on homepage
            if (typeof App !== 'undefined' && App.loadPublicTreasury) {
                App.loadPublicTreasury();
            }
        } catch (err) {
            console.error('Save transaction error:', err);
            if (typeof App !== 'undefined') App.toast('Failed to save transaction: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            if (typeof feather !== 'undefined') feather.replace();
        }
    },

    async deleteTransaction(id) {
        if (typeof App === 'undefined' || !App.confirm) return;

        App.confirm('Are you sure you want to delete this transaction? This action cannot be undone.', async () => {
            try {
                const { error } = await supabaseAdmin
                    .from('treasury')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                App.toast('Transaction deleted successfully', 'success');
                this.loadTreasury();

                if (App.loadPublicTreasury) App.loadPublicTreasury();

                App.logActivity('treasury_deleted', { id });
            } catch (err) {
                console.error('Delete transaction error:', err);
                App.toast('Failed to delete transaction', 'error');
            }
        });
    },

    // ============================================================
    // VIEW RECEIPT
    // ============================================================
    viewReceipt(url) {
        if (!url) return;

        const existing = document.getElementById('receiptViewer');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'receiptViewer';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9800;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            animation: fadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <button style="position: absolute; top: 1.5rem; right: 1.5rem; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onclick="document.getElementById('receiptViewer').remove()" onmouseover="this.style.background='var(--danger)'; this.style.transform='rotate(90deg)';" onmouseout="this.style.background='rgba(255,255,255,0.15)'; this.style.transform='rotate(0deg)';">
                <i data-feather="x" style="width:22px;height:22px;"></i>
            </button>
            <img src="${this.esc(url)}" style="max-width: 100%; max-height: 100%; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);" alt="Receipt">
        `;

        document.body.appendChild(overlay);
        if (typeof feather !== 'undefined') feather.replace();

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // ESC to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    // ============================================================
    // DOWNLOAD MODAL
    // ============================================================
    openDownloadModal() {
        const modal = document.getElementById('treasuryDownloadModal');
        if (modal) {
            modal.classList.remove('hidden');

            // Set default dates (current month)
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const fromInput = document.getElementById('downloadFromDate');
            const toInput = document.getElementById('downloadToDate');

            if (fromInput && !fromInput.value) {
                fromInput.value = firstDay.toISOString().split('T')[0];
            }
            if (toInput && !toInput.value) {
                toInput.value = lastDay.toISOString().split('T')[0];
            }
        }
    },

    closeDownloadModal() {
        const modal = document.getElementById('treasuryDownloadModal');
        if (modal) modal.classList.add('hidden');
    },

    // ============================================================
    // EXCEL DOWNLOAD (CSV Format - Universal Excel Compatible)
    // ============================================================
    async downloadStatement(fromDate, toDate) {
        try {
            let query = supabaseAdmin
                .from('treasury')
                .select('*')
                .order('transaction_date', { ascending: true })
                .order('created_at', { ascending: true });

            if (fromDate) query = query.gte('transaction_date', fromDate);
            if (toDate) query = query.lte('transaction_date', toDate);

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                if (typeof App !== 'undefined') App.toast('No transactions found for the selected period', 'warning');
                return;
            }

            // Get settings for header
            const settings = (typeof App !== 'undefined' && App.settings) ? App.settings : {};
            const clubName = settings.club_name || 'Rotaract Club of Coimbatore Unity';
            const parentClub = settings.parent_club || 'Family of Rotary Club of Coimbatore East';
            const clubId = settings.club_id || '91594';
            const district = settings.district || 'Rotary International District 3206';

            // Format dates for filename
            const fromStr = fromDate ? this.formatDateForFile(fromDate) : 'All';
            const toStr = toDate ? this.formatDateForFile(toDate) : 'All';
            const filename = `Treasury_Statement_${fromStr}_to_${toStr}.xls`;

            // Calculate totals
            let totalIncome = 0;
            let totalExpense = 0;
            let runningBalance = 0;

            // Build Excel-compatible HTML (opens in Excel)
            let html = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<html xmlns="http://www.w3.org/TR/REC-html40" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: 'Calibri', sans-serif; }
    .header-row { background: #1a56db; color: white; font-weight: bold; text-align: center; }
    .info-row { background: #eef2ff; text-align: center; padding: 8px; }
    .table-header { background: #0f172a; color: white; font-weight: bold; text-align: center; }
    .income { color: #16a34a; font-weight: bold; }
    .expense { color: #dc2626; font-weight: bold; }
    .balance { color: #1a56db; font-weight: bold; }
    .total-row { background: #fef3c7; font-weight: bold; border-top: 2px solid #000; }
    .final-row { background: #dcfce7; font-weight: bold; font-size: 14pt; border-top: 3px solid #000; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #cbd5e1; padding: 6px 8px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
</style>
</head>
<body>
<table>
    <tr class="header-row">
        <td colspan="8" style="font-size: 16pt; padding: 12px;">${clubName}</td>
    </tr>
    <tr class="info-row">
        <td colspan="8" style="font-size: 11pt;">${parentClub}</td>
    </tr>
    <tr class="info-row">
        <td colspan="8">Club ID: ${clubId} | ${district}</td>
    </tr>
    <tr class="info-row">
        <td colspan="8" style="font-size: 12pt; font-weight: bold; padding: 10px;">
            TREASURY STATEMENT
        </td>
    </tr>
    <tr class="info-row">
        <td colspan="8">
            Period: ${fromDate ? this.formatDate(fromDate) : 'Beginning'} to ${toDate ? this.formatDate(toDate) : 'Current'}
        </td>
    </tr>
    <tr class="info-row">
        <td colspan="8" style="font-size: 9pt;">
            Generated on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN')}
        </td>
    </tr>
    <tr><td colspan="8" style="height: 10px; border: none;"></td></tr>
    <tr class="table-header">
        <th style="width: 5%;">S.No</th>
        <th style="width: 12%;">Date</th>
        <th style="width: 25%;">Particular</th>
        <th style="width: 13%;">Category</th>
        <th style="width: 12%;">Income (Rs.)</th>
        <th style="width: 12%;">Expense (Rs.)</th>
        <th style="width: 13%;">Balance (Rs.)</th>
        <th style="width: 8%;">Notes</th>
    </tr>
`;

            data.forEach((t, idx) => {
                const income = parseFloat(t.income) || 0;
                const expense = parseFloat(t.expense) || 0;
                runningBalance += (income - expense);
                totalIncome += income;
                totalExpense += expense;

                html += `
    <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${this.formatDate(t.transaction_date)}</td>
        <td class="text-left">${this.esc(t.particular)}</td>
        <td class="text-center">${this.esc(t.category || '-')}</td>
        <td class="text-right ${income > 0 ? 'income' : ''}">${income > 0 ? this.formatNumber(income) : '-'}</td>
        <td class="text-right ${expense > 0 ? 'expense' : ''}">${expense > 0 ? this.formatNumber(expense) : '-'}</td>
        <td class="text-right balance">${this.formatNumber(runningBalance)}</td>
        <td class="text-left" style="font-size: 9pt;">${this.esc(t.notes || '')}</td>
    </tr>
`;
            });

            // Totals row
            html += `
    <tr class="total-row">
        <td colspan="4" class="text-right">TOTAL:</td>
        <td class="text-right income">${this.formatNumber(totalIncome)}</td>
        <td class="text-right expense">${this.formatNumber(totalExpense)}</td>
        <td class="text-right balance">${this.formatNumber(runningBalance)}</td>
        <td></td>
    </tr>
    <tr class="final-row">
        <td colspan="4" class="text-right">CLOSING BALANCE:</td>
        <td colspan="3" class="text-right" style="color: ${runningBalance >= 0 ? '#16a34a' : '#dc2626'};">
            Rs. ${this.formatNumber(Math.abs(runningBalance))} ${runningBalance >= 0 ? '(Credit)' : '(Debit)'}
        </td>
        <td></td>
    </tr>
    <tr><td colspan="8" style="height: 20px; border: none;"></td></tr>
    <tr>
        <td colspan="8" class="text-center" style="border: none; font-size: 9pt; color: #64748b;">
            This is a computer-generated statement.
        </td>
    </tr>
    <tr>
        <td colspan="8" class="text-center" style="border: none; font-size: 9pt; color: #64748b;">
            Rotaract Club of Coimbatore Unity | Club ID: ${clubId} | RI District 3206
        </td>
    </tr>
</table>
</body>
</html>`;

            // Download the file
            const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            if (typeof App !== 'undefined') {
                App.toast(`Statement downloaded (${data.length} transactions)`, 'success');
                App.logActivity('treasury_downloaded', { from: fromDate, to: toDate, count: data.length });
            }
        } catch (err) {
            console.error('Download statement error:', err);
            if (typeof App !== 'undefined') App.toast('Failed to download statement', 'error');
        }
    },

    // ============================================================
    // MONTHLY SUMMARY (For Auto-Email)
    // ============================================================
    async getMonthlySummary(year, month) {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const { data, error } = await supabaseAdmin
                .from('treasury')
                .select('*')
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate);

            if (error) throw error;

            let income = 0, expense = 0;
            (data || []).forEach(t => {
                income += parseFloat(t.income) || 0;
                expense += parseFloat(t.expense) || 0;
            });

            return {
                income,
                expense,
                balance: income - expense,
                count: (data || []).length,
                transactions: data || []
            };
        } catch (err) {
            console.error('Monthly summary error:', err);
            return null;
        }
    },

    // ============================================================
    // CATEGORY ANALYSIS
    // ============================================================
    async getCategoryAnalysis(fromDate, toDate) {
        try {
            let query = supabaseAdmin.from('treasury').select('*');
            if (fromDate) query = query.gte('transaction_date', fromDate);
            if (toDate) query = query.lte('transaction_date', toDate);

            const { data, error } = await query;
            if (error) throw error;

            const categories = {};
            (data || []).forEach(t => {
                const cat = t.category || 'Uncategorized';
                if (!categories[cat]) {
                    categories[cat] = { income: 0, expense: 0, count: 0 };
                }
                categories[cat].income += parseFloat(t.income) || 0;
                categories[cat].expense += parseFloat(t.expense) || 0;
                categories[cat].count += 1;
            });

            return categories;
        } catch (err) {
            console.error('Category analysis error:', err);
            return {};
        }
    },

    // ============================================================
    // BALANCE AT DATE
    // ============================================================
    async getBalanceAtDate(date) {
        try {
            const { data } = await supabaseAdmin
                .from('treasury')
                .select('income, expense')
                .lte('transaction_date', date);

            let balance = 0;
            (data || []).forEach(t => {
                balance += (parseFloat(t.income) || 0) - (parseFloat(t.expense) || 0);
            });

            return balance;
        } catch (err) {
            console.error('Balance at date error:', err);
            return 0;
        }
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

    formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return '₹ ' + num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    formatNumber(amount) {
        const num = parseFloat(amount) || 0;
        return num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    },

    formatDateForFile(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toISOString().split('T')[0].replace(/-/g, '');
        } catch {
            return dateStr;
        }
    }
};

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof Treasury !== 'undefined') Treasury.init();
    }, 500);
});

// Global exposure
window.Treasury = Treasury;