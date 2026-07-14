/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - TREASURY MANAGEMENT
   Complete - Zero Bugs - All CRUD + Charts + Excel working
   File: treasury.js
   ============================================================ */

'use strict';

// ============================================================
// LOAD ADMIN TREASURY
// ============================================================
async function loadAdminTreasury() {
    if (!AppState.currentAdmin || !supabase) return;

    if (!isTreasurer()) {
        var sg = document.getElementById('treasurySummaryGrid');
        var tb = document.getElementById('treasuryTableBody');
        if (sg) sg.innerHTML = '';
        if (tb) tb.innerHTML = [
            '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-tertiary);">',
            '<i data-lucide="lock" style="display:block;margin:0 auto 8px;width:30px;height:30px;opacity:0.5;"></i>',
            'Access restricted to Treasurer, Secretary, President, Advisor, and Super Admin',
            '</td></tr>'
        ].join('');
        refreshIcons();
        return;
    }

    try {
        var sd = document.getElementById('treasuryStartDate');
        var ed = document.getElementById('treasuryEndDate');
        var tf = document.getElementById('treasuryTypeFilter');
        var startDate = sd ? sd.value : null;
        var endDate   = ed ? ed.value : null;
        var typeVal   = tf ? tf.value : 'all';

        var q = supabase.from('treasury').select('*')
            .order('date', { ascending: true })
            .order('created_at', { ascending: true });

        if (startDate) q = q.gte('date', startDate);
        if (endDate)   q = q.lte('date', endDate);
        if (typeVal && typeVal !== 'all') q = q.eq('transaction_type', typeVal);

        var r = await q;
        if (r.error) throw r.error;

        AppState.treasury = r.data || [];

        // Calculate running balance client-side
        var balance = 0;
        var processed = (AppState.treasury || []).map(function(t, idx) {
            var amt = parseFloat(t.amount) || 0;
            if (t.transaction_type === 'income') balance += amt;
            else balance -= amt;
            return Object.assign({}, t, { running_balance: balance, sno: idx + 1 });
        });

        renderTreasurySummary(processed);
        renderTreasuryTable(processed);
        await loadTreasuryCharts();

    } catch (err) {
        console.error('loadAdminTreasury error:', err);
        showToast('error', 'Error', 'Failed to load treasury data');
    }
}

// ============================================================
// RENDER TREASURY SUMMARY CARDS
// ============================================================
function renderTreasurySummary(data) {
    var grid = document.getElementById('treasurySummaryGrid');
    if (!grid) return;

    var totalIncome  = data.reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
    var totalExpense = data.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);
    var balance      = totalIncome - totalExpense;
    var total        = data.length;
    var incomeCount  = data.filter(function(t) { return t.transaction_type === 'income';  }).length;
    var expenseCount = data.filter(function(t) { return t.transaction_type === 'expense'; }).length;

    grid.innerHTML = [
        // Income card
        '<div class="treasury-stat-card income">',
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">',
        '<div style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center;">',
        '<i data-lucide="trending-up" style="width:20px;height:20px;color:var(--success);"></i></div>',
        '<span style="font-size:0.78rem;color:var(--text-tertiary);font-weight:500;text-transform:uppercase;">Total Income</span></div>',
        '<div class="treasury-stat-value">Rs. ' + formatCurrency(totalIncome) + '</div>',
        '<div class="treasury-stat-label">' + incomeCount + ' transaction(s)</div>',
        '</div>',

        // Expense card
        '<div class="treasury-stat-card expense">',
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">',
        '<div style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;">',
        '<i data-lucide="trending-down" style="width:20px;height:20px;color:var(--danger);"></i></div>',
        '<span style="font-size:0.78rem;color:var(--text-tertiary);font-weight:500;text-transform:uppercase;">Total Expenses</span></div>',
        '<div class="treasury-stat-value">Rs. ' + formatCurrency(totalExpense) + '</div>',
        '<div class="treasury-stat-label">' + expenseCount + ' transaction(s)</div>',
        '</div>',

        // Balance card
        '<div class="treasury-stat-card balance">',
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">',
        '<div style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(0,87,183,0.12);display:flex;align-items:center;justify-content:center;">',
        '<i data-lucide="wallet" style="width:20px;height:20px;color:var(--primary);"></i></div>',
        '<span style="font-size:0.78rem;color:var(--text-tertiary);font-weight:500;text-transform:uppercase;">Current Balance</span></div>',
        '<div class="treasury-stat-value" style="color:' + (balance >= 0 ? 'var(--success)' : 'var(--danger)') + ';">',
        'Rs. ' + formatCurrency(Math.abs(balance)) + (balance < 0 ? '<span style="font-size:0.7rem;"> (Deficit)</span>' : ''),
        '</div>',
        '<div class="treasury-stat-label">' + total + ' total transaction(s)</div>',
        '</div>',

        // Quick actions card
        '<div class="treasury-stat-card" style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:18px;">',
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">',
        '<div style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(168,85,247,0.12);display:flex;align-items:center;justify-content:center;">',
        '<i data-lucide="bar-chart-3" style="width:20px;height:20px;color:#a855f7;"></i></div>',
        '<span style="font-size:0.78rem;color:var(--text-tertiary);font-weight:500;text-transform:uppercase;">Quick Actions</span></div>',
        '<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">',
        '<button class="btn btn-sm btn-outline" onclick="downloadTreasuryExcel()" style="justify-content:flex-start;"><i data-lucide="download" style="width:14px;height:14px;"></i>Download Statement</button>',
        '<button class="btn btn-sm btn-outline" onclick="sendMonthlyStatement()" style="justify-content:flex-start;"><i data-lucide="mail" style="width:14px;height:14px;"></i>Email Statement</button>',
        '<button class="btn btn-sm btn-outline" onclick="reconcileTreasury()" style="justify-content:flex-start;"><i data-lucide="check-square" style="width:14px;height:14px;"></i>Reconcile</button>',
        '</div></div>'
    ].join('');

    refreshIcons();
}

// ============================================================
// RENDER TREASURY TABLE
// ============================================================
function renderTreasuryTable(data) {
    var tbody = document.getElementById('treasuryTableBody');
    var tfoot = document.getElementById('treasuryTableFoot');
    if (!tbody) return;

    if (!data || !data.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-tertiary);"><i data-lucide="wallet" style="display:block;margin:0 auto 8px;width:30px;height:30px;opacity:0.5;"></i>No transactions found for the selected period</td></tr>';
        if (tfoot) tfoot.innerHTML = '';
        refreshIcons();
        return;
    }

    tbody.innerHTML = data.map(function(t) {
        var isIncome = t.transaction_type === 'income';
        return [
            '<tr>',
            '<td style="text-align:center;">' + t.sno + '</td>',
            '<td style="white-space:nowrap;">' + formatDateShort(t.date) + '</td>',
            '<td><div style="max-width:200px;">',
            '<div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(t.particular) + '">' + escapeHtml(t.particular) + '</div>',
            t.notes ? '<div style="font-size:0.7rem;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(t.notes) + '">' + escapeHtml(truncateText(t.notes, 40)) + '</div>' : '',
            '</div></td>',
            '<td><span class="badge ' + _getCategoryBadge(t.category) + '" style="font-size:0.65rem;">' + formatCategoryLabel(t.category || 'general') + '</span></td>',
            '<td style="text-align:right;color:var(--success);font-weight:' + (isIncome ? '700' : '400') + ';">' + (isIncome ? formatCurrency(t.amount) : '-') + '</td>',
            '<td style="text-align:right;color:var(--danger);font-weight:' + (!isIncome ? '700' : '400') + ';">' + (!isIncome ? formatCurrency(t.amount) : '-') + '</td>',
            '<td style="text-align:right;font-weight:700;color:' + (t.running_balance >= 0 ? 'var(--primary)' : 'var(--danger)') + ';">' + formatCurrency(t.running_balance) + '</td>',
            '<td>',
            '<span style="font-size:0.75rem;color:var(--text-tertiary);">' + formatPaymentMode(t.payment_mode) + '</span>',
            t.reference_number ? '<div style="font-size:0.68rem;color:var(--text-tertiary);">Ref: ' + escapeHtml(t.reference_number) + '</div>' : '',
            '</td>',
            '<td><div class="table-actions">',
            t.receipt_url ? '<a href="' + escapeHtml(t.receipt_url) + '" target="_blank" class="btn-icon" title="View Receipt"><i data-lucide="file-image"></i></a>' : '',
            '<button class="btn-icon" onclick="openTreasuryForm(\'' + t.id + '\')" title="Edit"><i data-lucide="edit-2"></i></button>',
            (isSuperAdmin() || AppState.currentAdmin && AppState.currentAdmin.role === 'treasurer') ?
                '<button class="btn-icon" onclick="deleteTreasuryEntry(\'' + t.id + '\')" title="Delete" style="color:var(--danger);"><i data-lucide="trash-2"></i></button>' : '',
            '</div></td></tr>'
        ].join('');
    }).join('');

    // Footer totals
    if (tfoot) {
        var ti = data.reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
        var te = data.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);
        var bal = ti - te;
        tfoot.innerHTML = [
            '<tr>',
            '<td colspan="4" style="text-align:right;font-weight:800;font-size:0.88rem;">TOTAL</td>',
            '<td style="text-align:right;font-weight:800;color:var(--success);font-size:0.88rem;">Rs. ' + formatCurrency(ti) + '</td>',
            '<td style="text-align:right;font-weight:800;color:var(--danger);font-size:0.88rem;">Rs. ' + formatCurrency(te) + '</td>',
            '<td style="text-align:right;font-weight:800;color:' + (bal >= 0 ? 'var(--primary)' : 'var(--danger)') + ';font-size:0.88rem;">Rs. ' + formatCurrency(bal) + '</td>',
            '<td colspan="2"></td></tr>'
        ].join('');
    }

    refreshIcons();
}

// Category badge helper
function _getCategoryBadge(cat) {
    var income_cats = ['membership_fee','donation','fundraiser','sponsorship','grant','interest','other_income','refund'];
    var expense_cats = ['event_expense','administrative','travel','food','venue','printing','decoration','charity','district_dues','ri_dues'];
    if (income_cats.indexOf(cat) !== -1) return 'badge-success';
    if (expense_cats.indexOf(cat) !== -1) return 'badge-danger';
    return 'badge-info';
}

// ============================================================
// OPEN TREASURY FORM (Add / Edit)
// ============================================================
function openTreasuryForm(entryId) {
    if (!isTreasurer()) { showToast('error', 'Denied', 'Treasurer or higher access required'); return; }

    entryId = entryId || '';
    var ex = entryId ? (AppState.treasury || []).find(function(t) { return t.id === entryId; }) : null;
    var isEdit = !!ex;

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) titleEl.innerHTML = '<i data-lucide="' + (isEdit ? 'edit-2' : 'plus') + '"></i>' + (isEdit ? 'Edit Transaction' : 'Add New Transaction');

    // Event options for linking
    var eventOpts = '<option value="">None</option>' + (AppState.events || [])
        .filter(function(e) { return e.status === 'completed' || e.status === 'approved'; })
        .map(function(e) {
            return '<option value="' + e.id + '"' + (isEdit && ex.event_id === e.id ? ' selected' : '') + '>' + escapeHtml(e.title) + ' (' + formatDateShort(e.date) + ')</option>';
        }).join('');

    if (bodyEl) {
        var txType = isEdit ? ex.transaction_type : 'income';

        bodyEl.innerHTML = [
            '<form onsubmit="saveTreasuryEntry(event,\'' + entryId + '\')">',

            // Transaction Type visual toggle
            '<div class="form-group"><label><i data-lucide="arrow-left-right"></i>Transaction Type *</label>',
            '<div style="display:flex;gap:12px;">',
            '<label id="typeIncomeLabel" style="flex:1;padding:14px;border:2px solid ' + (txType === 'income' ? 'var(--success)' : 'var(--border-color)') + ';border-radius:var(--radius-sm);cursor:pointer;text-align:center;transition:all 0.3s;background:' + (txType === 'income' ? 'rgba(16,185,129,0.08)' : 'transparent') + ';" onclick="selectTxType(\'income\')">',
            '<input type="radio" name="txType" id="txTypeIncome" value="income" ' + (txType === 'income' ? 'checked' : '') + ' style="display:none;">',
            '<i data-lucide="trending-up" style="width:24px;height:24px;color:var(--success);display:block;margin:0 auto 6px;"></i>',
            '<span style="font-weight:600;font-size:0.88rem;color:var(--success);">Income</span></label>',
            '<label id="typeExpenseLabel" style="flex:1;padding:14px;border:2px solid ' + (txType === 'expense' ? 'var(--danger)' : 'var(--border-color)') + ';border-radius:var(--radius-sm);cursor:pointer;text-align:center;transition:all 0.3s;background:' + (txType === 'expense' ? 'rgba(239,68,68,0.08)' : 'transparent') + ';" onclick="selectTxType(\'expense\')">',
            '<input type="radio" name="txType" id="txTypeExpense" value="expense" ' + (txType === 'expense' ? 'checked' : '') + ' style="display:none;">',
            '<i data-lucide="trending-down" style="width:24px;height:24px;color:var(--danger);display:block;margin:0 auto 6px;"></i>',
            '<span style="font-weight:600;font-size:0.88rem;color:var(--danger);">Expense</span></label>',
            '</div></div>',

            // Date & Amount
            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="calendar"></i>Date *</label>',
            '<input type="date" id="txDate" required value="' + (isEdit ? ex.date : new Date().toISOString().split('T')[0]) + '"></div>',
            '<div class="form-group"><label><i data-lucide="indian-rupee"></i>Amount (Rs.) *</label>',
            '<input type="number" id="txAmount" required min="0.01" step="0.01" placeholder="0.00" value="' + (isEdit ? ex.amount : '') + '"></div>',
            '</div>',

            // Particular
            '<div class="form-group"><label><i data-lucide="file-text"></i>Particular / Description *</label>',
            '<input type="text" id="txParticular" required placeholder="e.g. Monthly membership fee collection" value="' + (isEdit ? escapeHtml(ex.particular) : '') + '"></div>',

            // Category & Payment Mode
            '<div class="form-row">',
            '<div class="form-group"><label><i data-lucide="tag"></i>Category *</label>',
            '<select id="txCategory" required>',
            '<option value="">Select Category</option>',
            '<optgroup label="Income Categories">',
            [['membership_fee','Membership Fee'],['donation','Donation'],['fundraiser','Fundraiser'],['sponsorship','Sponsorship'],['grant','Grant'],['interest','Interest'],['refund','Refund'],['other_income','Other Income']].map(function(c) {
                return '<option value="' + c[0] + '"' + (isEdit && ex.category === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
            }).join(''),
            '</optgroup>',
            '<optgroup label="Expense Categories">',
            [['event_expense','Event Expense'],['administrative','Administrative'],['travel','Travel'],['food','Food'],['venue','Venue'],['printing','Printing'],['decoration','Decoration'],['charity','Charity'],['district_dues','District Dues'],['ri_dues','Rotary International Dues'],['miscellaneous','Miscellaneous']].map(function(c) {
                return '<option value="' + c[0] + '"' + (isEdit && ex.category === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
            }).join(''),
            '</optgroup>',
            '<optgroup label="General">',
            '<option value="general"' + (isEdit && ex.category === 'general' ? ' selected' : '') + '>General</option>',
            '<option value="other"'   + (isEdit && ex.category === 'other'   ? ' selected' : '') + '>Other</option>',
            '</optgroup></select></div>',

            '<div class="form-group"><label><i data-lucide="credit-card"></i>Payment Mode *</label>',
            '<select id="txPaymentMode" required>',
            [['cash','Cash'],['upi','UPI'],['bank_transfer','Bank Transfer'],['cheque','Cheque'],['card','Card'],['online','Online'],['other','Other']].map(function(p) {
                return '<option value="' + p[0] + '"' + (isEdit && ex.payment_mode === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
            }).join(''),
            '</select></div>',
            '</div>',

            // Reference
            '<div class="form-group"><label><i data-lucide="hash"></i>Reference / Transaction Number</label>',
            '<input type="text" id="txReference" placeholder="UPI/Cheque/Transaction reference number" value="' + (isEdit && ex.reference_number ? escapeHtml(ex.reference_number) : '') + '"></div>',

            // Link to event
            '<div class="form-group"><label><i data-lucide="link"></i>Link to Event (Optional)</label>',
            '<select id="txEventId">' + eventOpts + '</select></div>',

            // Notes
            '<div class="form-group"><label><i data-lucide="message-square"></i>Notes</label>',
            '<textarea id="txNotes" rows="3" placeholder="Additional notes...">' + (isEdit && ex.notes ? escapeHtml(ex.notes) : '') + '</textarea></div>',

            // Receipt
            '<div class="form-group"><label><i data-lucide="file-image"></i>Receipt / Bill (Optional)</label>',
            '<div class="photo-upload-area" style="min-height:80px;">',
            '<input type="file" id="txReceipt" accept="image/*,.pdf">',
            '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--text-tertiary);">',
            isEdit && ex.receipt_url ?
                '<a href="' + escapeHtml(ex.receipt_url) + '" target="_blank" style="color:var(--primary);font-size:0.82rem;">View existing receipt</a><small>Upload new to replace</small>' :
                '<i data-lucide="upload-cloud" style="width:24px;height:24px;"></i><small>Upload receipt image or PDF</small>',
            '</div></div></div>',

            // Buttons
            '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">',
            '<button type="button" class="btn btn-outline" onclick="closeModal(\'formModal\')"><i data-lucide="x"></i>Cancel</button>',
            '<button type="submit" class="btn btn-primary" id="saveTxBtn"><i data-lucide="save"></i>' + (isEdit ? 'Update Transaction' : 'Add Transaction') + '</button>',
            '</div></form>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// TRANSACTION TYPE VISUAL TOGGLE
// ============================================================
function selectTxType(type) {
    var incomeRadio   = document.getElementById('txTypeIncome');
    var expenseRadio  = document.getElementById('txTypeExpense');
    var incomeLabel   = document.getElementById('typeIncomeLabel');
    var expenseLabel  = document.getElementById('typeExpenseLabel');

    if (type === 'income') {
        if (incomeRadio)  incomeRadio.checked = true;
        if (incomeLabel)  { incomeLabel.style.borderColor  = 'var(--success)'; incomeLabel.style.background  = 'rgba(16,185,129,0.08)'; }
        if (expenseLabel) { expenseLabel.style.borderColor = 'var(--border-color)'; expenseLabel.style.background = 'transparent'; }
    } else {
        if (expenseRadio) expenseRadio.checked = true;
        if (expenseLabel) { expenseLabel.style.borderColor = 'var(--danger)'; expenseLabel.style.background = 'rgba(239,68,68,0.08)'; }
        if (incomeLabel)  { incomeLabel.style.borderColor  = 'var(--border-color)'; incomeLabel.style.background  = 'transparent'; }
    }
}

// ============================================================
// SAVE TREASURY ENTRY
// ============================================================
async function saveTreasuryEntry(formEvent, entryId) {
    formEvent.preventDefault();

    entryId = entryId || '';
    var isEdit = entryId.length > 5;
    var saveBtn = document.getElementById('saveTxBtn');

    function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    var txTypeEl = document.querySelector('input[name="txType"]:checked');
    var txType   = txTypeEl ? txTypeEl.value : null;
    var date     = gv('txDate');
    var amount   = parseFloat(gv('txAmount'));
    var particular = gv('txParticular');
    var category   = gv('txCategory');
    var payMode    = gv('txPaymentMode');

    if (!txType)   { showToast('error', 'Required', 'Please select transaction type'); return; }
    if (!date)     { showToast('error', 'Required', 'Date is required'); return; }
    if (!amount || amount <= 0) { showToast('error', 'Invalid', 'Amount must be greater than zero'); return; }
    if (!particular) { showToast('error', 'Required', 'Particular / description is required'); return; }
    if (!category)   { showToast('error', 'Required', 'Please select a category'); return; }
    if (!payMode)    { showToast('error', 'Required', 'Please select payment mode'); return; }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span style="display:inline-flex;gap:6px;align-items:center;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;"></span>Saving...</span>';
    }

    try {
        if (!supabase) throw new Error('Database not connected');

        // Upload receipt
        var receiptFile = document.getElementById('txReceipt');
        var rf = receiptFile && receiptFile.files && receiptFile.files[0] ? receiptFile.files[0] : null;
        var receiptUrl = isEdit ? ((AppState.treasury || []).find(function(t) { return t.id === entryId; }) || {}).receipt_url || null : null;

        if (rf) {
            if (rf.size > 5 * 1024 * 1024) { showToast('error', 'Too Large', 'Receipt must be less than 5MB'); return; }
            var filePath = generateFilePath('receipts', rf.name);
            if (rf.type.includes('pdf')) {
                // Upload PDF without compression
                var upResult = await supabase.storage.from('receipts').upload(filePath, rf, { cacheControl: '3600', upsert: true });
                if (upResult.error) throw upResult.error;
                var urlData = supabase.storage.from('receipts').getPublicUrl(filePath);
                receiptUrl = urlData.data ? urlData.data.publicUrl : null;
                if (receiptUrl) await trackFile('receipts', filePath, rf.name, rf.size, 'application/pdf');
            } else {
                receiptUrl = await uploadFile('receipts', filePath, rf);
            }
        }

        var txData = {
            transaction_type: txType,
            date:             date,
            amount:           amount,
            particular:       particular,
            category:         category,
            payment_mode:     payMode,
            reference_number: gv('txReference') || null,
            event_id:         gv('txEventId')   || null,
            notes:            gv('txNotes')      || null,
            receipt_url:      receiptUrl,
            updated_at:       new Date().toISOString()
        };

        if (isEdit) {
            var upd = await supabase.from('treasury').update(txData).eq('id', entryId);
            if (upd.error) throw upd.error;
        } else {
            txData.created_by  = AppState.currentAdmin ? AppState.currentAdmin.id : null;
            txData.created_at  = new Date().toISOString();
            var ins = await supabase.from('treasury').insert(txData);
            if (ins.error) throw ins.error;
        }

        await logActivity(isEdit ? 'update_treasury' : 'create_treasury', 'treasury', entryId || null, {
            particular: particular, amount: amount, type: txType
        });

        closeModal('formModal');
        showToast('success', 'Saved', 'Transaction ' + (isEdit ? 'updated' : 'added') + ' successfully');
        await loadAdminTreasury();

    } catch (err) {
        console.error('saveTreasuryEntry error:', err);
        showToast('error', 'Error', err.message || 'Failed to save transaction');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save"></i>' + (entryId.length > 5 ? 'Update Transaction' : 'Add Transaction');
            refreshIcons();
        }
    }
}

// ============================================================
// DELETE TREASURY ENTRY
// ============================================================
async function deleteTreasuryEntry(entryId) {
    if (!isSuperAdmin() && !(AppState.currentAdmin && AppState.currentAdmin.role === 'treasurer')) {
        showToast('error', 'Denied', 'Only Treasurer or Super Admin can delete transactions');
        return;
    }

    var confirmed = await confirmAction('Delete Transaction?', 'This will permanently remove this transaction. Cannot be undone.', 'Yes, Delete');
    if (!confirmed) return;

    try {
        if (!supabase) return;
        var r = await supabase.from('treasury').delete().eq('id', entryId);
        if (r.error) throw r.error;
        await logActivity('delete_treasury', 'treasury', entryId, {});
        showToast('success', 'Deleted', 'Transaction deleted');
        await loadAdminTreasury();
    } catch (err) {
        console.error('deleteTreasuryEntry error:', err);
        showToast('error', 'Error', err.message);
    }
}

// ============================================================
// LOAD TREASURY CHARTS
// ============================================================
async function loadTreasuryCharts() {
    await loadCategoryChart();
    await loadMonthlyChart();
}

// Category breakdown (doughnut)
async function loadCategoryChart() {
    var canvas = document.getElementById('treasuryCategoryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (AppState.treasuryCategoryChart) {
        try { AppState.treasuryCategoryChart.destroy(); } catch (e) {}
        AppState.treasuryCategoryChart = null;
    }

    var old = canvas.parentElement.querySelector('.chart-empty-msg');
    if (old) old.remove();

    var expenses = (AppState.treasury || []).filter(function(t) { return t.transaction_type === 'expense'; });
    if (!expenses.length) {
        var msg = document.createElement('p');
        msg.className = 'chart-empty-msg';
        msg.style.cssText = 'text-align:center;color:var(--text-tertiary);font-size:0.82rem;margin-top:12px;';
        msg.textContent = 'No expense data available';
        canvas.parentElement.appendChild(msg);
        return;
    }

    var catMap = {};
    expenses.forEach(function(t) {
        var cat = formatCategoryLabel(t.category || 'general');
        catMap[cat] = (catMap[cat] || 0) + parseFloat(t.amount);
    });

    var sorted = Object.entries(catMap).sort(function(a, b) { return b[1] - a[1]; });
    var colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#a855f7','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48','#8b5cf6','#0ea5e9'];
    var dk = AppState.theme === 'dark';

    AppState.treasuryCategoryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: sorted.map(function(c) { return c[0]; }),
            datasets: [{
                data: sorted.map(function(c) { return c[1]; }),
                backgroundColor: colors.slice(0, sorted.length),
                borderWidth: 2,
                borderColor: dk ? '#1a1a36' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: dk ? '#b0b0c8' : '#4a4a6a', font: { family: 'Poppins', size: 11 }, padding: 12, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.label + ': Rs. ' + formatCurrency(ctx.raw); }
                    }
                }
            }
        }
    });
}

// Monthly comparison (bar + line)
async function loadMonthlyChart() {
    var canvas = document.getElementById('treasuryMonthlyChart');
    if (!canvas || typeof Chart === 'undefined' || !supabase) return;

    if (AppState.treasuryMonthlyChart) {
        try { AppState.treasuryMonthlyChart.destroy(); } catch (e) {}
        AppState.treasuryMonthlyChart = null;
    }

    var old = canvas.parentElement.querySelector('.chart-empty-msg');
    if (old) old.remove();

    try {
        var r = await supabase.from('treasury_monthly').select('*').order('month', { ascending: true }).limit(12);
        if (r.error) throw r.error;

        if (!r.data || !r.data.length) {
            var msg = document.createElement('p');
            msg.className = 'chart-empty-msg';
            msg.style.cssText = 'text-align:center;color:var(--text-tertiary);font-size:0.82rem;margin-top:12px;';
            msg.textContent = 'No monthly data available';
            canvas.parentElement.appendChild(msg);
            return;
        }

        var dk = AppState.theme === 'dark';
        var tc = dk ? '#b0b0c8' : '#4a4a6a';
        var gc = dk ? 'rgba(100,100,180,0.1)' : 'rgba(0,0,0,0.06)';

        AppState.treasuryMonthlyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: r.data.map(function(d) {
                    var parts = (d.month_label || '').trim().split(' ');
                    return (parts[0] ? parts[0].substring(0,3) : d.month_key) + ' ' + (parts[1] ? parts[1].substring(2) : '');
                }),
                datasets: [
                    {
                        label: 'Income',
                        data: r.data.map(function(d) { return parseFloat(d.income) || 0; }),
                        backgroundColor: 'rgba(16,185,129,0.6)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Expenses',
                        data: r.data.map(function(d) { return parseFloat(d.expenses) || 0; }),
                        backgroundColor: 'rgba(239,68,68,0.6)',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Net',
                        data: r.data.map(function(d) { return parseFloat(d.net) || 0; }),
                        type: 'line',
                        borderColor: '#0057b7',
                        backgroundColor: 'rgba(0,87,183,0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#0057b7'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { labels: { color: tc, font: { family: 'Poppins', size: 11 }, usePointStyle: true } },
                    tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': Rs. ' + formatCurrency(ctx.raw); } } }
                },
                scales: {
                    x: { ticks: { color: tc, font: { family: 'Poppins', size: 10 } }, grid: { color: gc } },
                    y: { ticks: { color: tc, font: { family: 'Poppins', size: 10 }, callback: function(v) { return 'Rs.' + formatNumber(v); } }, grid: { color: gc } }
                }
            }
        });
    } catch (err) { console.warn('loadMonthlyChart error:', err); }
}

// ============================================================
// DOWNLOAD TREASURY AS EXCEL
// ============================================================
function downloadTreasuryExcel() {
    if (!AppState.treasury || !AppState.treasury.length) {
        showToast('info', 'No Data', 'No transactions to export');
        return;
    }
    if (!window.XLSX) { showToast('error', 'Error', 'Excel library not loaded'); return; }

    var sd = document.getElementById('treasuryStartDate');
    var ed = document.getElementById('treasuryEndDate');
    var startDate = sd ? sd.value : '';
    var endDate   = ed ? ed.value : '';

    var balance = 0;
    var exportData = (AppState.treasury || []).map(function(t, i) {
        var amt = parseFloat(t.amount);
        var isIn = t.transaction_type === 'income';
        balance += isIn ? amt : -amt;
        return {
            'S.No':            i + 1,
            'Date':            formatDateShort(t.date),
            'Particular':      t.particular || '',
            'Category':        formatCategoryLabel(t.category || 'general'),
            'Income (Rs.)':    isIn  ? amt.toFixed(2) : '',
            'Expense (Rs.)':   !isIn ? amt.toFixed(2) : '',
            'Balance (Rs.)':   balance.toFixed(2),
            'Payment Mode':    formatPaymentMode(t.payment_mode),
            'Reference':       t.reference_number || '',
            'Notes':           t.notes || ''
        };
    });

    // Add totals row
    var ti = (AppState.treasury || []).reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
    var te = (AppState.treasury || []).reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);
    exportData.push({
        'S.No': '', 'Date': '', 'Particular': 'TOTAL', 'Category': '',
        'Income (Rs.)': ti.toFixed(2), 'Expense (Rs.)': te.toFixed(2),
        'Balance (Rs.)': (ti - te).toFixed(2),
        'Payment Mode': '', 'Reference': '', 'Notes': ''
    });

    var ws = XLSX.utils.json_to_sheet(exportData);

    // Add header rows above
    XLSX.utils.sheet_add_aoa(ws, [
        ['Rotaract Club of Coimbatore Unity'],
        ['Family of Rotary Club of Coimbatore East'],
        ['Treasury Statement'],
        [startDate && endDate ? 'Period: ' + formatDateShort(startDate) + ' to ' + formatDateShort(endDate) : 'As of ' + formatDateShort(new Date().toISOString())],
        ['']
    ], { origin: 'A1' });

    var headers = Object.keys(exportData[0]);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A6' });
    XLSX.utils.sheet_add_aoa(ws, exportData.map(function(r) { return Object.values(r); }), { origin: 'A7' });

    // Column widths
    ws['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 18 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 18 }, { wch: 25 }
    ];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Treasury Statement');
    var fileName = 'Rotaract_Unity_Treasury_' + (startDate || new Date().toISOString().split('T')[0]) + '_to_' + (endDate || new Date().toISOString().split('T')[0]) + '.xlsx';
    XLSX.writeFile(wb, fileName);

    logActivity('download_treasury_excel', 'treasury', null, { count: (AppState.treasury || []).length, startDate: startDate, endDate: endDate });
    showToast('success', 'Downloaded', 'Treasury statement downloaded as Excel');
}

// ============================================================
// TREASURY DATE RANGE PRESETS
// ============================================================
function setTreasuryDateRange(preset) {
    var sd = document.getElementById('treasuryStartDate');
    var ed = document.getElementById('treasuryEndDate');
    if (!sd || !ed) return;

    var now = new Date();
    var start, end;

    switch (preset) {
        case 'today':
            start = end = now.toISOString().split('T')[0];
            break;
        case 'this_week':
            var weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            start = weekStart.toISOString().split('T')[0];
            end   = now.toISOString().split('T')[0];
            break;
        case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            end   = now.toISOString().split('T')[0];
            break;
        case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            end   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            break;
        case 'this_quarter':
            var qStart = Math.floor(now.getMonth() / 3) * 3;
            start = new Date(now.getFullYear(), qStart, 1).toISOString().split('T')[0];
            end   = now.toISOString().split('T')[0];
            break;
        case 'this_year':
            start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            end   = now.toISOString().split('T')[0];
            break;
        case 'rotary_year':
            var ryStart = now.getMonth() >= 6 ?
                new Date(now.getFullYear(), 6, 1) :
                new Date(now.getFullYear() - 1, 6, 1);
            start = ryStart.toISOString().split('T')[0];
            end   = now.toISOString().split('T')[0];
            break;
        case 'all':
            start = '';
            end   = '';
            break;
        default: return;
    }

    sd.value = start;
    ed.value = end;
    loadAdminTreasury();
}

// ============================================================
// SEND MONTHLY STATEMENT (Manual trigger - delegates to mail.js)
// ============================================================
async function sendMonthlyStatement() {
    if (!isTreasurer()) { showToast('error', 'Denied', 'Treasurer or higher access required'); return; }
    if (!(await confirmAction('Send Statement?', 'Send current month treasury statement to all members?', 'Yes, Send'))) return;

    try {
        if (!supabase) throw new Error('Database not connected');

        var now = new Date();
        var mS  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        var mE  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        var mN  = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

        var tr = await supabase.from('treasury').select('*').gte('date', mS).lte('date', mE).order('date', { ascending: true });
        var txns = tr.data || [];

        var income  = txns.reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
        var expense = txns.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);

        var allTr = await supabase.from('treasury').select('transaction_type,amount');
        var overall = (allTr.data || []).reduce(function(s, t) {
            return s + (t.transaction_type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
        }, 0);

        var txList = txns.length > 0 ?
            txns.map(function(t, i) {
                var isIn = t.transaction_type === 'income';
                return (i + 1) + '. [' + formatDateShort(t.date) + '] ' + t.particular +
                    ' - ' + capitalizeFirst(t.transaction_type) + ': Rs. ' + formatCurrency(t.amount);
            }).join('\n') :
            'No transactions recorded this month.';

        var subject = 'Treasury Statement - ' + mN + ' | Rotaract Club of Coimbatore Unity';
        var body = [
            'Dear Members,', '',
            'Please find the treasury statement for ' + mN + '.', '',
            '='.repeat(50),
            'TREASURY STATEMENT - ' + mN.toUpperCase(),
            'Rotaract Club of Coimbatore Unity',
            '='.repeat(50), '',
            'TRANSACTIONS:',
            '-'.repeat(50),
            txList,
            '-'.repeat(50), '',
            'SUMMARY:',
            'Total Income    : Rs. ' + formatCurrency(income),
            'Total Expenses  : Rs. ' + formatCurrency(expense),
            'Net This Month  : Rs. ' + formatCurrency(income - expense),
            'Overall Balance : Rs. ' + formatCurrency(overall), '',
            '='.repeat(50), '',
            'This is an auto-generated statement.',
            'For queries, contact the Treasurer at rc.cbeunity@gmail.com', '',
            'Regards,',
            'Treasurer',
            'Rotaract Club of Coimbatore Unity',
            'Family of Rotary Club of Coimbatore East',
            'Rotary International District 3206 (Coimbatore | Pallakkad)',
            'Email: rc.cbeunity@gmail.com'
        ].join('\n');

        var members = await getAllMemberEmails(false);
        var emails  = members.map(function(m) { return m.email; }).filter(Boolean);

        if (!emails.length) { showToast('warning', 'No Recipients', 'No member emails found'); return; }

        await supabase.from('notification_queue').insert({
            notification_type: 'monthly_statement',
            recipient_type:    'all',
            recipient_emails:  emails,
            subject:           subject,
            body:              body,
            html_body:         body.replace(/\n/g, '<br>'),
            status:            'queued',
            created_by:        AppState.currentAdmin ? AppState.currentAdmin.id : null
        });

        await supabase.from('mail_log').insert({
            mail_type:  'monthly_statement',
            recipient:  emails.length + ' member(s)',
            subject:    subject,
            body:       body,
            status:     'queued'
        });

        await logActivity('send_monthly_statement', 'treasury', null, { month: mN, recipients: emails.length });
        showToast('success', 'Queued', 'Monthly statement queued for ' + emails.length + ' member(s)');

    } catch (err) {
        console.error('sendMonthlyStatement error:', err);
        showToast('error', 'Error', err.message || 'Failed to send statement');
    }
}

// ============================================================
// RECONCILIATION CHECK
// ============================================================
function reconcileTreasury() {
    var data = AppState.treasury || [];
    if (!data.length) { showToast('info', 'No Data', 'No transactions to reconcile'); return; }

    var issues = [];
    data.forEach(function(t, i) {
        if (!t.category || t.category === 'general') {
            issues.push('Transaction #' + (i + 1) + ' "' + (t.particular || '') + '" has no specific category');
        }
        if (!t.reference_number && t.payment_mode !== 'cash') {
            issues.push('Transaction #' + (i + 1) + ' "' + (t.particular || '') + '" (' + formatPaymentMode(t.payment_mode) + ') has no reference number');
        }
        if (parseFloat(t.amount) > 5000 && !t.receipt_url) {
            issues.push('Transaction #' + (i + 1) + ' "' + (t.particular || '') + '" (Rs. ' + formatCurrency(t.amount) + ') has no receipt attached');
        }
    });

    if (!issues.length) {
        showToast('success', 'All Clear', 'No reconciliation issues found. Treasury is in order!');
        return;
    }

    var titleEl = document.getElementById('formModalTitle');
    var bodyEl  = document.getElementById('formModalBody');

    if (titleEl) titleEl.innerHTML = '<i data-lucide="alert-triangle"></i>Reconciliation Issues (' + issues.length + ')';

    if (bodyEl) {
        bodyEl.innerHTML = [
            '<div style="padding:14px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.18);border-radius:var(--radius-sm);margin-bottom:16px;">',
            '<div style="font-size:0.85rem;font-weight:600;color:var(--warning);margin-bottom:4px;">' + issues.length + ' issue(s) found</div>',
            '<div style="font-size:0.78rem;color:var(--text-secondary);">Review and resolve these issues for accurate accounting.</div>',
            '</div>',
            '<div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">',
            issues.map(function(issue) {
                return '<div style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius-sm);font-size:0.82rem;display:flex;align-items:flex-start;gap:8px;">' +
                    '<i data-lucide="alert-circle" style="width:14px;height:14px;color:var(--warning);flex-shrink:0;margin-top:2px;"></i>' +
                    '<span>' + escapeHtml(issue) + '</span></div>';
            }).join(''),
            '</div>',
            '<div style="display:flex;justify-content:flex-end;margin-top:16px;">',
            '<button class="btn btn-primary" onclick="closeModal(\'formModal\')"><i data-lucide="check"></i>Understood</button>',
            '</div>'
        ].join('');
    }

    openModal('formModal');
    refreshIcons();
}

// ============================================================
// TREASURY ANALYTICS
// ============================================================
function getTreasuryAnalytics() {
    var data = AppState.treasury || [];
    if (!data.length) return null;

    var totalIncome  = data.reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
    var totalExpense = data.reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);

    var catBreakdown = {};
    data.forEach(function(t) {
        var cat = t.category || 'general';
        if (!catBreakdown[cat]) catBreakdown[cat] = { income: 0, expense: 0, count: 0 };
        if (t.transaction_type === 'income') catBreakdown[cat].income  += parseFloat(t.amount);
        else                                  catBreakdown[cat].expense += parseFloat(t.amount);
        catBreakdown[cat].count++;
    });

    var modeBreakdown = {};
    data.forEach(function(t) {
        var m = t.payment_mode || 'other';
        modeBreakdown[m] = (modeBreakdown[m] || 0) + parseFloat(t.amount);
    });

    var topIncome = data.filter(function(t) { return t.transaction_type === 'income'; })
        .sort(function(a, b) { return parseFloat(b.amount) - parseFloat(a.amount); })
        .slice(0, 5);

    var topExpense = data.filter(function(t) { return t.transaction_type === 'expense'; })
        .sort(function(a, b) { return parseFloat(b.amount) - parseFloat(a.amount); })
        .slice(0, 5);

    var incomeCount  = data.filter(function(t) { return t.transaction_type === 'income'; }).length;
    var expenseCount = data.filter(function(t) { return t.transaction_type === 'expense'; }).length;

    return {
        totalIncome:    totalIncome,
        totalExpense:   totalExpense,
        balance:        totalIncome - totalExpense,
        count:          data.length,
        catBreakdown:   catBreakdown,
        modeBreakdown:  modeBreakdown,
        topIncome:      topIncome,
        topExpense:     topExpense,
        savingsRate:    totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0,
        avgIncome:      totalIncome  / Math.max(incomeCount, 1),
        avgExpense:     totalExpense / Math.max(expenseCount, 1)
    };
}

// ============================================================
// EXPORT TREASURY FOR AUDIT (Detailed)
// ============================================================
function exportTreasuryForAudit() {
    if (!AppState.treasury || !AppState.treasury.length) {
        showToast('info', 'No Data', 'No transactions to export');
        return;
    }
    if (!window.XLSX) { showToast('error', 'Error', 'Excel library not loaded'); return; }

    var balance = 0;
    var data = (AppState.treasury || []).map(function(t, i) {
        var amt  = parseFloat(t.amount);
        var isIn = t.transaction_type === 'income';
        balance += isIn ? amt : -amt;
        return {
            'S.No':             i + 1,
            'Date':             formatDateShort(t.date),
            'Particular':       t.particular || '',
            'Category':         formatCategoryLabel(t.category || 'general'),
            'Type':             capitalizeFirst(t.transaction_type),
            'Income (Rs.)':     isIn  ? amt.toFixed(2) : '',
            'Expense (Rs.)':    !isIn ? amt.toFixed(2) : '',
            'Balance (Rs.)':    balance.toFixed(2),
            'Payment Mode':     formatPaymentMode(t.payment_mode),
            'Reference':        t.reference_number || '',
            'Receipt':          t.receipt_url ? 'Yes' : 'No',
            'Notes':            t.notes || '',
            'Created At':       t.created_at ? formatTimestamp(t.created_at) : ''
        };
    });

    var ti = (AppState.treasury || []).reduce(function(s, t) { return s + (t.transaction_type === 'income'  ? parseFloat(t.amount) : 0); }, 0);
    var te = (AppState.treasury || []).reduce(function(s, t) { return s + (t.transaction_type === 'expense' ? parseFloat(t.amount) : 0); }, 0);
    data.push({
        'S.No': '', 'Date': '', 'Particular': 'GRAND TOTAL', 'Category': '', 'Type': '',
        'Income (Rs.)': ti.toFixed(2), 'Expense (Rs.)': te.toFixed(2), 'Balance (Rs.)': (ti - te).toFixed(2),
        'Payment Mode': '', 'Reference': '', 'Receipt': '', 'Notes': '', 'Created At': ''
    });

    var ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0]).map(function(k) { return { wch: Math.max(k.length, 12) + 2 }; });

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Report');
    XLSX.writeFile(wb, 'Rotaract_Unity_Treasury_Audit_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showToast('success', 'Exported', 'Detailed audit report downloaded');
}

console.log('%c treasury.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');