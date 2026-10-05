// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Advanced Treasury Management System
// File: js/treasury.js | Version: 9.0.0
// Premium Excel Export | Role-Based PDF Routing
// ============================================

(function () {
    'use strict';

    const DEFAULT_TREASURY_SEED = [];

    const CLUB_INFO = {
        name: 'ROTARACT CLUB OF COIMBATORE UNITY',
        shortName: 'RAC Coimbatore Unity',
        tagline: 'Service Above Self',
        district: 'RID 3206',
        clubId: '91594',
        parent: 'Family of Rotary Club of Coimbatore East',
        region: 'Coimbatore | Palakkad',
        charter: '21.04.2014',
        address: 'Coimbatore, Tamil Nadu, India',
        email: 'treasury@racunity.org',
        phone: '+91 98765 43210',
        website: 'www.racunity.org',
        logoUrl: 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png',
        colors: {
            cranberry: 'FFE4345A',
            navy: 'FF17458F',
            gold: 'FFF7A81B',
            success: 'FF10B981',
            danger: 'FFEF4444',
            warning: 'FFF59E0B',
            info: 'FF3B82F6',
            purple: 'FF8B5CF6',
            dark: 'FF0F172A',
            darkText: 'FF1E293B',
            gray: 'FF64748B',
            grayLight: 'FF94A3B8',
            light: 'FFF8FAFC',
            lighter: 'FFF1F5F9',
            border: 'FFE2E8F0',
            white: 'FFFFFFFF',
            pastelGreen: 'FFECFDF5',
            pastelRed: 'FFFEF2F2',
            pastelBlue: 'FFEFF6FF',
            pastelGold: 'FFFFFBEB',
            pastelPink: 'FFFDF2F8',
            pastelPurple: 'FFF5F3FF'
        }
    };

    const EDGE_FUNCTION_URL = 'https://sbpwmkoxuokrscddhhuw.supabase.co/functions/v1/generate-pdf';

    // ------------------------------------------------------------------
    // Supabase bridge
    // ------------------------------------------------------------------
    function createTableStore(table, columns, opts) {
        opts = opts || {};
        const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const uuidCols = opts.uuidColumns || [];
        const textCols = opts.textColumns || [];
        let snapshot = new Map();
        const client = () => window.DB_ADMIN || window.DB || window.supabaseClient;
        const need = () => { const c = client(); if (!c) throw new Error('Database client (DB_ADMIN) is not available.'); return c; };
        const pick = (row) => {
            const out = {};
            columns.forEach(c => {
                let v = row[c];
                if (v === undefined) return;
                if (uuidCols.includes(c) && !UUID.test(v || '')) v = null;
                if (textCols.includes(c) && v !== null) v = String(v);
                out[c] = v;
            });
            return out;
        };
        const sig = (row) => JSON.stringify(pick(row));
        const store = {
            isUuid: (v) => UUID.test(v || ''),
            async get() {
                const { data, error } = await need().from(table).select('*')
                    .order(opts.orderBy || 'created_at', { ascending: false }).limit(5000);
                if (error) throw new Error(error.message);
                snapshot = new Map((data || []).map(r => [r.id, sig(r)]));
                return data || [];
            },
            async set(rows) {
                const db = need();
                for (const row of rows) {
                    if (store.isUuid(row.id) && snapshot.has(row.id)) {
                        if (snapshot.get(row.id) === sig(row)) continue;
                        const { error } = await db.from(table).update(pick(row)).eq('id', row.id);
                        if (error) throw new Error(error.message);
                        snapshot.set(row.id, sig(row));
                    } else {
                        const { data, error } = await db.from(table).insert(pick(row)).select('id').single();
                        if (error) throw new Error(error.message);
                        row.id = data.id;
                        snapshot.set(row.id, sig(row));
                    }
                }
            },
            async remove(id) {
                const { error } = await need().from(table).delete().eq('id', id);
                if (error) throw new Error(error.message);
                snapshot.delete(id);
            }
        };
        return store;
    }

    const treasuryStore = createTableStore('treasury', [
        'transaction_date','particular','description','income','expense','category',
        'receipt_url','receipt_public_id','receipt_provider','event_id','approved','approved_by','created_by'
    ], { orderBy: 'transaction_date', uuidColumns: ['event_id','approved_by','created_by'] });

    const DB = {
        async get(key, fallback) {
            if (key !== 'treasury') return fallback;
            const rows = await treasuryStore.get();
            const asc = [...rows].sort((a, b) =>
                (new Date(a.transaction_date) - new Date(b.transaction_date)) ||
                (new Date(a.created_at || 0) - new Date(b.created_at || 0)));
            let run = 0;
            asc.forEach(t => { if (t.approved) run += (parseFloat(t.income) || 0) - (parseFloat(t.expense) || 0); t.balance = run; });
            return rows;
        },
        async set(key, value) { if (key === 'treasury') await treasuryStore.set(value); return true; },
        async remove(id) { await treasuryStore.remove(id); }
    };

    const Auth = window.AuthManager || {
        currentUser: { id: 'usr-demo-admin', name: 'System Administrator', role: 'President' }
    };

    const FallbackAdmin = {
        fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; },
        esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; },
        notify(type, msg) { alert(`[${type.toUpperCase()}] ${msg}`); },
        logActivity(act, mod, target, data) { console.log(`Logged: ${act} on ${mod}::${target}`, data); },
        createModal(options) {
            const el = document.createElement('div');
            el.id = 'fallback-admin-modal';
            el.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
            const sizeClass = options.size === 'wide' ? 'max-w-4xl' : options.size === 'narrow' ? 'max-w-md' : 'max-w-lg';
            el.innerHTML = `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl ${sizeClass} w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2"><i class="fa-solid fa-${options.icon || 'folder'}"></i> ${options.title}</h3>
                        <button onclick="AdminTreasury.closeFallbackModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl">&times;</button>
                    </div>
                    <div class="p-6 overflow-y-auto flex-1 text-slate-700 dark:text-slate-300">${options.body}</div>
                    <div class="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">${options.footer}</div>
                </div>
            `;
            document.body.appendChild(el);
        },
        closeModal() {
            const el = document.getElementById('fallback-admin-modal');
            if (el) el.remove();
        }
    };

    const A = new Proxy({}, {
        get(_, key) {
            const real = window.AdminPanel;
            const src = (real && key in real) ? real : FallbackAdmin;
            const v = src[key];
            return typeof v === 'function' ? v.bind(src) : v;
        }
    });

    const toast = window.AppToast || {
        success(m) { A.notify('success', m); },
        error(m) { A.notify('error', m); },
        info(m) { A.notify('info', m); }
    };

    // ----- Library Loader (ExcelJS + FileSaver) -----
    const LibLoader = {
        loaded: {},
        loading: {},
        async load(url, globalCheck) {
            if (globalCheck && typeof window[globalCheck] !== 'undefined') {
                this.loaded[url] = true;
                return;
            }
            if (this.loaded[url]) return;
            if (this.loading[url]) return this.loading[url];

            this.loading[url] = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.onload = () => {
                    this.loaded[url] = true;
                    this.loading[url] = null;
                    resolve();
                };
                script.onerror = () => {
                    this.loading[url] = null;
                    reject(new Error(`Failed to load library: ${url}`));
                };
                document.head.appendChild(script);
            });
            return this.loading[url];
        },
        async loadExcelJS() {
            await this.load('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js', 'ExcelJS');
            await this.load('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js', 'saveAs');
            if (typeof ExcelJS === 'undefined') throw new Error('ExcelJS failed to load');
            if (typeof saveAs === 'undefined') throw new Error('FileSaver failed to load');
        },
        async fetchLogoAsBase64() {
            try {
                const response = await fetch(CLUB_INFO.logoUrl, { mode: 'cors' });
                if (!response.ok) return null;
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const dataUrl = reader.result;
                        // Strip the data:image/*;base64, prefix for ExcelJS
                        const base64 = dataUrl.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn('Logo fetch failed:', e);
                return null;
            }
        }
    };

    const AdminTreasury = {
        currentView: 'dashboard',
        currentPage: 1,
        pageSize: 25,
        searchQuery: '',
        categoryFilter: 'all',
        typeFilter: 'all',
        dateRange: { start: null, end: null },
        selectedRows: [],
        hasFullAccess: true,

        INCOME_CATEGORIES: [
            { value: 'membership_fee', label: 'Membership Fees', icon: 'fa-id-card', color: '#1a73e8' },
            { value: 'event_contribution', label: 'Event Contributions', icon: 'fa-ticket', color: '#7c3aed' },
            { value: 'sponsorship', label: 'Sponsorships', icon: 'fa-handshake', color: '#06b6d4' },
            { value: 'donation', label: 'Donations', icon: 'fa-hand-holding-heart', color: '#ec4899' },
            { value: 'fundraising', label: 'Fundraising', icon: 'fa-bullseye', color: '#22c55e' },
            { value: 'grant', label: 'Grants', icon: 'fa-award', color: '#eab308' },
            { value: 'interest', label: 'Bank Interest', icon: 'fa-percent', color: '#14b8a6' },
            { value: 'misc_income', label: 'Miscellaneous Income', icon: 'fa-plus-circle', color: '#64748b' }
        ],

        EXPENSE_CATEGORIES: [
            { value: 'event_expense', label: 'Event Expenses', icon: 'fa-calendar-check', color: '#ef4444' },
            { value: 'operations', label: 'Operations', icon: 'fa-gear', color: '#f97316' },
            { value: 'printing_stationery', label: 'Printing & Stationery', icon: 'fa-print', color: '#6366f1' },
            { value: 'travel', label: 'Travel', icon: 'fa-plane', color: '#06b6d4' },
            { value: 'food_refreshments', label: 'Food & Refreshments', icon: 'fa-utensils', color: '#eab308' },
            { value: 'awards_recognition', label: 'Awards & Recognition', icon: 'fa-trophy', color: '#f59e0b' },
            { value: 'donation_given', label: 'Donations Given', icon: 'fa-gift', color: '#ec4899' },
            { value: 'district_dues', label: 'District Dues', icon: 'fa-building-columns', color: '#7c3aed' },
            { value: 'bank_charges', label: 'Bank Charges', icon: 'fa-money-check', color: '#94a3b8' },
            { value: 'marketing', label: 'Marketing & Promotion', icon: 'fa-bullhorn', color: '#ec4899' },
            { value: 'venue_rental', label: 'Venue Rental', icon: 'fa-landmark', color: '#8b5cf6' },
            { value: 'equipment', label: 'Equipment', icon: 'fa-screwdriver-wrench', color: '#64748b' },
            { value: 'misc_expense', label: 'Miscellaneous Expense', icon: 'fa-minus-circle', color: '#dc2626' }
        ],

        async render(workspace) {
            if (!workspace) return;
            const user = Auth.currentUser;
            if (!user) {
                workspace.innerHTML = this.renderUnauthorized();
                return;
            }
            this.hasFullAccess = true;

            workspace.innerHTML = `
                <div class="p-6 lg:p-10">
                    <div class="admin-page-header">
                        <div>
                            <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Treasury Ledger</span></div>
                            <h1 class="admin-page-title">Treasury Command Center</h1>
                            <p class="admin-page-subtitle">Complete financial management with CA-grade analytics and reporting.</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button class="btn-primary" onclick="AdminTreasury.openTransactionForm()">
                                <i class="fa-solid fa-plus mr-1.5"></i> New Transaction
                            </button>
                            <button class="btn-secondary btn-sm" onclick="AdminTreasury.showExportMenu()">
                                <i class="fa-solid fa-download mr-1.5"></i> Export
                            </button>
                        </div>
                    </div>

                    <div class="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
                        <button class="treasury-tab-btn active" data-view="dashboard" onclick="AdminTreasury.switchView('dashboard')">
                            <i class="fa-solid fa-chart-pie mr-1.5"></i>Dashboard
                        </button>
                        <button class="treasury-tab-btn" data-view="ledger" onclick="AdminTreasury.switchView('ledger')">
                            <i class="fa-solid fa-book mr-1.5"></i>General Ledger
                        </button>
                        <button class="treasury-tab-btn" data-view="analytics" onclick="AdminTreasury.switchView('analytics')">
                            <i class="fa-solid fa-chart-line mr-1.5"></i>Analytics
                        </button>
                        <button class="treasury-tab-btn" data-view="categories" onclick="AdminTreasury.switchView('categories')">
                            <i class="fa-solid fa-tags mr-1.5"></i>Categories
                        </button>
                        <button class="treasury-tab-btn" data-view="reports" onclick="AdminTreasury.switchView('reports')">
                            <i class="fa-solid fa-file-invoice mr-1.5"></i>Reports
                        </button>
                        <button class="treasury-tab-btn" data-view="budget" onclick="AdminTreasury.switchView('budget')">
                            <i class="fa-solid fa-bullseye mr-1.5"></i>Budget
                        </button>
                    </div>

                    <div id="treasury-view-container"></div>
                </div>
            `;
            await this.switchView('dashboard');
        },

        async switchView(view) {
            this.currentView = view;
            document.querySelectorAll('.treasury-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-view') === view);
            });

            const container = document.getElementById('treasury-view-container');
            if (!container) return;
            container.innerHTML = '<div class="py-12 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</div>';

            try {
                switch (view) {
                    case 'dashboard': await this.renderDashboard(container); break;
                    case 'ledger': await this.renderLedger(container); break;
                    case 'analytics': await this.renderAnalytics(container); break;
                    case 'categories': await this.renderCategories(container); break;
                    case 'reports': await this.renderReports(container); break;
                    case 'budget': await this.renderBudget(container); break;
                }
            } catch (e) {
                console.error('Treasury view error:', e);
                container.innerHTML = `<div class="text-center py-16"><i class="fa-solid fa-triangle-exclamation text-red-500 text-2xl mb-3 block"></i><p class="text-xs text-red-500">Error loading view: ${e.message}</p></div>`;
            }
        },

        async renderDashboard(container) {
            const [summary, monthly, latest, byCategory] = await Promise.all([
                this.getOverallSummary(),
                this.getMonthlyTrends(6),
                this.getLatestTransactions(5),
                this.getCategoryBreakdown()
            ]);

            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div class="stat-metric-card">
                        <div class="flex items-start justify-between mb-4">
                            <div class="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-up text-green-500"></i></div>
                            <span class="badge badge-green">All Time</span>
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Income</p>
                        <h3 class="text-2xl font-black text-green-600">${this.money(summary.totalIncome)}</h3>
                        <p class="text-[10px] text-slate-500 mt-2">${summary.incomeCount} transactions</p>
                    </div>
                    <div class="stat-metric-card">
                        <div class="flex items-start justify-between mb-4">
                            <div class="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-down text-red-500"></i></div>
                            <span class="badge badge-red">All Time</span>
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Expenses</p>
                        <h3 class="text-2xl font-black text-red-600">${this.money(summary.totalExpense)}</h3>
                        <p class="text-[10px] text-slate-500 mt-2">${summary.expenseCount} transactions</p>
                    </div>
                    <div class="stat-metric-card">
                        <div class="flex items-start justify-between mb-4">
                            <div class="w-11 h-11 rounded-xl bg-brand-blue/15 flex items-center justify-center"><i class="fa-solid fa-scale-balanced text-brand-blue"></i></div>
                            <span class="badge badge-blue">Current</span>
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Net Balance</p>
                        <h3 class="text-2xl font-black ${summary.balance >= 0 ? 'text-brand-blue' : 'text-red-600'}">${this.money(summary.balance)}</h3>
                        <p class="text-[10px] text-slate-500 mt-2">${summary.balance >= 0 ? 'Surplus' : 'Deficit'}</p>
                    </div>
                    <div class="stat-metric-card">
                        <div class="flex items-start justify-between mb-4">
                            <div class="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center"><i class="fa-solid fa-calendar-day text-purple-500"></i></div>
                            <span class="badge badge-purple">This Month</span>
                        </div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Monthly Net</p>
                        <h3 class="text-2xl font-black ${summary.monthlyNet >= 0 ? 'text-purple-600' : 'text-red-600'}">${this.money(summary.monthlyNet)}</h3>
                        <p class="text-[10px] text-slate-500 mt-2">${summary.monthlyTxns} transactions</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div class="lg:col-span-2 admin-panel">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-chart-column"></i> Monthly Trend (Last 6 Months)</h3>
                        </div>
                        <div class="admin-panel-body">${this.renderBarChart(monthly)}</div>
                    </div>
                    <div class="admin-panel">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-chart-pie"></i> Top Expense Categories</h3>
                        </div>
                        <div class="admin-panel-body">${this.renderCategoryBreakdown(byCategory)}</div>
                    </div>
                </div>

                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-clock-rotate-left"></i> Latest Transactions</h3>
                        <button class="text-[11px] font-bold text-brand-blue hover:underline" onclick="AdminTreasury.switchView('ledger')">View All →</button>
                    </div>
                    <div class="admin-panel-body p-0">
                        <div class="overflow-x-auto">
                            <table class="admin-data-table">
                                <thead>
                                    <tr><th>Date</th><th>Particular</th><th>Category</th><th class="text-right">Income</th><th class="text-right">Expense</th><th class="text-right">Balance</th></tr>
                                </thead>
                                <tbody>
                                    ${latest.length === 0
                                        ? '<tr><td colspan="6" class="text-center py-8 text-slate-400">No transactions yet.</td></tr>'
                                        : latest.map(t => this.renderTransactionRow(t, false)).join('')
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        },

        async renderLedger(container) {
            container.innerHTML = `
                <div class="admin-panel mb-6">
                    <div class="admin-panel-header flex-wrap gap-3">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-book"></i> General Ledger</h3>
                        <div class="flex items-center gap-2 flex-wrap">
                            <input type="text" id="txn-search" placeholder="Search..." value="${this.searchQuery}"
                                class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05]"
                                oninput="AdminTreasury.onSearchChange(this.value)">
                            <select id="type-filter" onchange="AdminTreasury.onTypeFilter(this.value)"
                                class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05]">
                                <option value="all">All Types</option>
                                <option value="income">Income Only</option>
                                <option value="expense">Expense Only</option>
                            </select>
                            <select id="category-filter" onchange="AdminTreasury.onCategoryFilter(this.value)"
                                class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05]">
                                <option value="all">All Categories</option>
                                <optgroup label="Income">
                                    ${this.INCOME_CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                                </optgroup>
                                <optgroup label="Expense">
                                    ${this.EXPENSE_CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                                </optgroup>
                            </select>
                            <input type="date" id="date-start" onchange="AdminTreasury.onDateRangeChange()" class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05]">
                            <input type="date" id="date-end" onchange="AdminTreasury.onDateRangeChange()" class="px-3 py-2 text-xs rounded-lg border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05]">
                            <button onclick="AdminTreasury.clearFilters()" class="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500" title="Clear filters">
                                <i class="fa-solid fa-filter-circle-xmark"></i>
                            </button>
                        </div>
                    </div>
                    <div id="ledger-summary-bar" class="px-6 py-3 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02]"></div>
                    <div class="admin-panel-body p-0" id="ledger-table-wrapper">
                        <div class="py-12 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</div>
                    </div>
                    <div class="p-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center" id="ledger-pagination"></div>
                </div>
            `;
            await this.loadLedgerData();
        },

        async loadLedgerData() {
            try {
                let txns = await DB.get('treasury', DEFAULT_TREASURY_SEED);

                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    txns = txns.filter(t =>
                        (t.particular || '').toLowerCase().includes(q) ||
                        (t.description || '').toLowerCase().includes(q)
                    );
                }
                if (this.typeFilter === 'income') txns = txns.filter(t => (parseFloat(t.income) || 0) > 0);
                else if (this.typeFilter === 'expense') txns = txns.filter(t => (parseFloat(t.expense) || 0) > 0);
                if (this.categoryFilter !== 'all') txns = txns.filter(t => t.category === this.categoryFilter);
                if (this.dateRange.start) txns = txns.filter(t => t.transaction_date >= this.dateRange.start);
                if (this.dateRange.end) txns = txns.filter(t => t.transaction_date <= this.dateRange.end);

                txns.sort((a, b) => {
                    const dateDiff = new Date(b.transaction_date) - new Date(a.transaction_date);
                    if (dateDiff !== 0) return dateDiff;
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                });

                const totalCount = txns.length;
                const totalPages = Math.ceil(totalCount / this.pageSize);
                if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;
                const offset = (this.currentPage - 1) * this.pageSize;
                const paginated = txns.slice(offset, offset + this.pageSize);

                this.renderLedgerTable(paginated, totalCount);
                this.renderLedgerSummary(paginated);
            } catch (e) {
                document.getElementById('ledger-table-wrapper').innerHTML = `<div class="p-8 text-center text-xs text-red-500">${e.message}</div>`;
            }
        },

        renderLedgerSummary(transactions) {
            const income = transactions.reduce((s, t) => s + (parseFloat(t.income) || 0), 0);
            const expense = transactions.reduce((s, t) => s + (parseFloat(t.expense) || 0), 0);
            const container = document.getElementById('ledger-summary-bar');
            if (!container) return;
            container.innerHTML = `
                <div class="flex items-center justify-between text-xs flex-wrap gap-3">
                    <div class="flex items-center gap-4">
                        <span><strong class="text-slate-500">Showing:</strong> ${transactions.length} entries</span>
                        <span><strong class="text-green-500">Income:</strong> ${this.money(income)}</span>
                        <span><strong class="text-red-500">Expense:</strong> ${this.money(expense)}</span>
                        <span><strong class="${(income - expense) >= 0 ? 'text-brand-blue' : 'text-red-500'}">Net:</strong> ${this.money(income - expense)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="AdminTreasury.exportToExcel()" class="text-[10px] font-bold text-green-600 hover:underline">
                            <i class="fa-solid fa-file-excel"></i> Excel
                        </button>
                        <button onclick="AdminTreasury.openPeriodPicker('range')" class="text-[10px] font-bold text-red-600 hover:underline">
                            <i class="fa-solid fa-file-pdf"></i> PDF
                        </button>
                    </div>
                </div>
            `;
        },

        renderLedgerTable(transactions, totalCount) {
            const wrapper = document.getElementById('ledger-table-wrapper');
            if (!wrapper) return;

            if (transactions.length === 0) {
                wrapper.innerHTML = `
                    <div class="empty-state py-16">
                        <i class="fa-solid fa-file-invoice-dollar empty-state-icon"></i>
                        <h4 class="empty-state-title">No Transactions Found</h4>
                        <p class="empty-state-desc">Try adjusting filters or add your first transaction.</p>
                        <button class="btn-primary mt-4" onclick="AdminTreasury.openTransactionForm()"><i class="fa-solid fa-plus mr-1"></i> New Transaction</button>
                    </div>
                `;
                document.getElementById('ledger-pagination').innerHTML = '';
                return;
            }

            wrapper.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="admin-data-table">
                        <thead>
                            <tr>
                                <th style="width:40px;"><input type="checkbox" onchange="AdminTreasury.toggleSelectAll(this.checked)"></th>
                                <th>S.No</th><th>Date</th><th>Particular</th><th>Category</th>
                                <th class="text-right">Income</th><th class="text-right">Expense</th>
                                <th class="text-right">Balance</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map((t, i) => this.renderTransactionRow(t, true, (this.currentPage - 1) * this.pageSize + i + 1)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            const totalPages = Math.ceil(totalCount / this.pageSize);
            const pagEl = document.getElementById('ledger-pagination');
            if (totalPages > 1) {
                let btns = '';
                const start = Math.max(1, this.currentPage - 2);
                const end = Math.min(totalPages, start + 4);
                for (let i = start; i <= end; i++) {
                    btns += `<button class="admin-pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="AdminTreasury.goToPage(${i})">${i}</button>`;
                }
                pagEl.innerHTML = `
                    <span class="text-[10px] text-slate-400">Showing ${((this.currentPage - 1) * this.pageSize) + 1}-${Math.min(this.currentPage * this.pageSize, totalCount)} of ${totalCount}</span>
                    <div class="flex items-center gap-1">
                        <button class="admin-pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="AdminTreasury.goToPage(${this.currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>
                        ${btns}
                        <button class="admin-pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="AdminTreasury.goToPage(${this.currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                `;
            } else {
                pagEl.innerHTML = `<span class="text-[10px] text-slate-400">${totalCount} transactions</span><div></div>`;
            }
        },

        renderTransactionRow(t, showActions, serialNum) {
            const income = parseFloat(t.income) || 0;
            const expense = parseFloat(t.expense) || 0;
            const balance = parseFloat(t.balance) || 0;
            const isIncome = income > 0;
            const category = this.getCategoryInfo(t.category);
            const rowClass = isIncome ? 'transaction-row-income' : 'transaction-row-expense';

            return `
                <tr class="${rowClass}" data-id="${t.id}">
                    ${showActions ? `<td><input type="checkbox" onchange="AdminTreasury.toggleRowSelection('${t.id}', this.checked)"></td>` : ''}
                    ${serialNum ? `<td><span class="text-[10px] text-slate-400 font-mono">${serialNum}</span></td>` : ''}
                    <td class="text-xs whitespace-nowrap"><span class="font-semibold">${A.fmtDate(t.transaction_date)}</span></td>
                    <td>
                        <p class="text-xs font-bold truncate max-w-xs" title="${A.esc(t.particular)}">${A.esc(t.particular)}</p>
                        ${t.description ? `<p class="text-[10px] text-slate-400 truncate max-w-xs">${A.esc(t.description)}</p>` : ''}
                    </td>
                    <td>
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold" style="background:${category.color}18;color:${category.color};">
                            <i class="fa-solid ${category.icon} text-[8px]"></i>${category.label}
                        </span>
                    </td>
                    <td class="text-right font-bold text-xs ${income > 0 ? 'text-green-600' : 'text-slate-300 dark:text-slate-600'}">${income > 0 ? this.money(income) : '—'}</td>
                    <td class="text-right font-bold text-xs ${expense > 0 ? 'text-red-600' : 'text-slate-300 dark:text-slate-600'}">${expense > 0 ? this.money(expense) : '—'}</td>
                    <td class="text-right font-black text-xs ${balance >= 0 ? 'text-brand-blue' : 'text-red-600'}">${this.money(balance)}</td>
                    <td>${t.approved ? '<span class="badge badge-green"><i class="fa-solid fa-check mr-0.5"></i>Approved</span>' : '<span class="badge badge-yellow"><i class="fa-solid fa-clock mr-0.5"></i>Pending</span>'}</td>
                    ${showActions ? `
                        <td>
                            <div class="flex items-center gap-1">
                                <button onclick="AdminTreasury.editTransaction('${t.id}')" class="cell-action-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                ${!t.approved ? `<button onclick="AdminTreasury.approveTransaction('${t.id}')" class="cell-action-btn" title="Approve" style="color:#22c55e;"><i class="fa-solid fa-check-circle"></i></button>` : ''}
                                <button onclick="AdminTreasury.deleteTransaction('${t.id}')" class="cell-action-btn danger" title="Delete"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    ` : ''}
                </tr>
            `;
        },

        async renderAnalytics(container) {
            const [monthly, yearly, categoryTrend, topTransactions] = await Promise.all([
                this.getMonthlyTrends(12),
                this.getYearlyComparison(),
                this.getCategoryTrends(),
                this.getTopTransactions(10)
            ]);

            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div class="admin-panel"><div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-chart-column"></i> 12-Month Trend</h3></div><div class="admin-panel-body">${this.renderBarChart(monthly, true)}</div></div>
                    <div class="admin-panel"><div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-chart-pie"></i> Year-over-Year</h3></div><div class="admin-panel-body">${this.renderYearlyComparison(yearly)}</div></div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div class="admin-panel"><div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-tags"></i> Income by Category</h3></div><div class="admin-panel-body">${this.renderCategoryList(categoryTrend.income, 'income')}</div></div>
                    <div class="admin-panel"><div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-tags"></i> Expense by Category</h3></div><div class="admin-panel-body">${this.renderCategoryList(categoryTrend.expense, 'expense')}</div></div>
                </div>
                <div class="admin-panel">
                    <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-trophy"></i> Top 10 Transactions</h3></div>
                    <div class="admin-panel-body p-0">
                        <div class="overflow-x-auto">
                            <table class="admin-data-table">
                                <thead><tr><th>Rank</th><th>Date</th><th>Particular</th><th>Category</th><th class="text-right">Amount</th></tr></thead>
                                <tbody>
                                    ${topTransactions.map((t, i) => {
                                        const amt = Math.max(parseFloat(t.income) || 0, parseFloat(t.expense) || 0);
                                        const isIncome = parseFloat(t.income) > 0;
                                        const cat = this.getCategoryInfo(t.category);
                                        return `<tr>
                                            <td><span class="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple text-white font-black text-[10px] flex items-center justify-center">${i + 1}</span></td>
                                            <td class="text-xs">${A.fmtDate(t.transaction_date)}</td>
                                            <td class="text-xs font-bold">${A.esc(t.particular)}</td>
                                            <td><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style="background:${cat.color}18;color:${cat.color};"><i class="fa-solid ${cat.icon} text-[8px]"></i>${cat.label}</span></td>
                                            <td class="text-right font-black text-xs ${isIncome ? 'text-green-600' : 'text-red-600'}">${isIncome ? '+' : '-'}${this.money(amt)}</td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        },

        async renderCategories(container) {
            const breakdown = await this.getCategoryBreakdown(true);
            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 class="text-sm font-black uppercase tracking-wider text-green-600 mb-4"><i class="fa-solid fa-arrow-trend-up mr-2"></i>Income Categories</h3>
                        <div class="space-y-3">
                            ${this.INCOME_CATEGORIES.map(cat => {
                                const data = breakdown.income[cat.value] || { total: 0, count: 0 };
                                return `
                                    <div class="category-pill-card">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${cat.color}18;"><i class="fa-solid ${cat.icon} text-lg" style="color:${cat.color};"></i></div>
                                            <div class="flex-1 min-w-0"><h4 class="text-sm font-bold">${cat.label}</h4><p class="text-[10px] text-slate-400">${data.count} transaction${data.count !== 1 ? 's' : ''}</p></div>
                                            <div class="text-right"><p class="text-base font-black text-green-600">${this.money(data.total)}</p></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div>
                        <h3 class="text-sm font-black uppercase tracking-wider text-red-600 mb-4"><i class="fa-solid fa-arrow-trend-down mr-2"></i>Expense Categories</h3>
                        <div class="space-y-3">
                            ${this.EXPENSE_CATEGORIES.map(cat => {
                                const data = breakdown.expense[cat.value] || { total: 0, count: 0 };
                                return `
                                    <div class="category-pill-card">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${cat.color}18;"><i class="fa-solid ${cat.icon} text-lg" style="color:${cat.color};"></i></div>
                                            <div class="flex-1 min-w-0"><h4 class="text-sm font-bold">${cat.label}</h4><p class="text-[10px] text-slate-400">${data.count} transaction${data.count !== 1 ? 's' : ''}</p></div>
                                            <div class="text-right"><p class="text-base font-black text-red-600">${this.money(data.total)}</p></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        },

        async renderReports(container) {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                    <div class="admin-panel cursor-pointer hover:scale-[1.02] transition-transform" onclick="AdminTreasury.openPeriodPicker('monthly')">
                        <div class="admin-panel-body text-center py-8">
                            <div class="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-calendar-days text-2xl text-brand-blue"></i></div>
                            <h4 class="text-sm font-bold mb-2">Monthly Treasury Report</h4>
                            <p class="text-[11px] text-slate-500 mb-4">KPI dashboard, weekly breakdowns, category analysis & ledger.</p>
                            <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-calendar-check mr-1"></i> Select Month</button>
                        </div>
                    </div>
                    <div class="admin-panel cursor-pointer hover:scale-[1.02] transition-transform" onclick="AdminTreasury.openPeriodPicker('quarterly')">
                        <div class="admin-panel-body text-center py-8">
                            <div class="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-chart-pie text-2xl text-purple-500"></i></div>
                            <h4 class="text-sm font-bold mb-2">Quarterly Report</h4>
                            <p class="text-[11px] text-slate-500 mb-4">3-month summary with trend analysis.</p>
                            <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-calendar-check mr-1"></i> Select Quarter</button>
                        </div>
                    </div>
                    <div class="admin-panel cursor-pointer hover:scale-[1.02] transition-transform" onclick="AdminTreasury.openPeriodPicker('annual')">
                        <div class="admin-panel-body text-center py-8">
                            <div class="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-file-invoice-dollar text-2xl text-green-500"></i></div>
                            <h4 class="text-sm font-bold mb-2">Annual Report</h4>
                            <p class="text-[11px] text-slate-500 mb-4">Full Rotary year report.</p>
                            <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-calendar-check mr-1"></i> Select Year</button>
                        </div>
                    </div>
                    <div class="admin-panel cursor-pointer hover:scale-[1.02] transition-transform" onclick="AdminTreasury.openPeriodPicker('range')">
                        <div class="admin-panel-body text-center py-8">
                            <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-calendar-days text-2xl text-cyan-500"></i></div>
                            <h4 class="text-sm font-bold mb-2">Custom Range</h4>
                            <p class="text-[11px] text-slate-500 mb-4">Any date range statement.</p>
                            <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-calendar-check mr-1"></i> Select Dates</button>
                        </div>
                    </div>
                    <div class="admin-panel cursor-pointer hover:scale-[1.02] transition-transform" onclick="AdminTreasury.quickGenerate('this_month')">
                        <div class="admin-panel-body text-center py-8">
                            <div class="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-bolt text-2xl text-orange-500"></i></div>
                            <h4 class="text-sm font-bold mb-2">Quick: This Month</h4>
                            <p class="text-[11px] text-slate-500 mb-4">Instant current month report.</p>
                            <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-download mr-1"></i> Generate Now</button>
                        </div>
                    </div>
                    <div class="admin-panel cursor-pointer hover:scale-[1.02] transition-transform" onclick="AdminTreasury.quickGenerate('last_month')">
                        <div class="admin-panel-body text-center py-8">
                            <div class="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-clock-rotate-left text-2xl text-pink-500"></i></div>
                            <h4 class="text-sm font-bold mb-2">Quick: Last Month</h4>
                            <p class="text-[11px] text-slate-500 mb-4">Previous month report.</p>
                            <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-download mr-1"></i> Generate Now</button>
                        </div>
                    </div>
                </div>
            `;
        },

        async renderBudget(container) {
            const breakdown = await this.getCategoryBreakdown();
            container.innerHTML = `
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h3 class="admin-panel-title"><i class="fa-solid fa-bullseye"></i> Expense Budget Tracking</h3>
                    </div>
                    <div class="admin-panel-body space-y-5">
                        ${this.EXPENSE_CATEGORIES.map(cat => {
                            const spent = breakdown.expense[cat.value]?.total || 0;
                            const budget = this.getBudgetForCategory(cat.value);
                            const percent = budget > 0 ? (spent / budget) * 100 : 0;
                            const status = percent > 90 ? 'danger' : percent > 70 ? 'warning' : 'safe';
                            return `
                                <div>
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background:${cat.color}18;"><i class="fa-solid ${cat.icon}" style="color:${cat.color};"></i></div>
                                            <div>
                                                <p class="text-xs font-bold">${cat.label}</p>
                                                <p class="text-[10px] text-slate-400">${this.money(spent)} of ${this.money(budget)}</p>
                                            </div>
                                        </div>
                                        <span class="text-xs font-black ${status === 'danger' ? 'text-red-600' : status === 'warning' ? 'text-yellow-600' : 'text-green-600'}">${percent.toFixed(1)}%</span>
                                    </div>
                                    <div class="budget-progress-bar">
                                        <div class="budget-progress-fill ${status}" style="width:${Math.min(percent, 100)}%;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        },

        // ============================================
        // PERIOD PICKER MODAL
        // ============================================
        openPeriodPicker(mode) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            const months = [];
            for (let y = currentYear; y >= currentYear - 1; y--) {
                for (let m = 12; m >= 1; m--) {
                    if (y === currentYear && m > currentMonth) continue;
                    const d = new Date(y, m - 1, 1);
                    months.push({
                        value: `${y}-${String(m).padStart(2, '0')}`,
                        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                        isCurrent: y === currentYear && m === currentMonth
                    });
                }
            }

            const years = [];
            for (let y = currentYear; y >= currentYear - 3; y--) years.push(y);

            const quarters = [
                { value: 'Q1', label: 'Q1 (Jan - Mar)' },
                { value: 'Q2', label: 'Q2 (Apr - Jun)' },
                { value: 'Q3', label: 'Q3 (Jul - Sep)' },
                { value: 'Q4', label: 'Q4 (Oct - Dec)' },
            ];

            let title = '', icon = '', bodyContent = '';

            if (mode === 'monthly') {
                title = 'Select Month for Treasury Report';
                icon = 'calendar';
                bodyContent = `
                    <div class="space-y-4 text-left">
                        <div class="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 rounded-xl p-4 border border-brand-blue/20">
                            <p class="text-xs text-slate-700 dark:text-slate-300"><i class="fa-solid fa-info-circle text-brand-blue mr-1.5"></i>Full insights, breakdowns, and ledger.</p>
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-2"><i class="fa-solid fa-calendar-alt mr-1 text-brand-blue"></i> Choose Month</label>
                            <select id="period-month-select" class="w-full text-sm p-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold">
                                ${months.map(m => `<option value="${m.value}" ${m.isCurrent ? 'selected' : ''}>${m.label}${m.isCurrent ? ' (Current)' : ''}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
            } else if (mode === 'quarterly') {
                title = 'Select Quarter';
                icon = 'chart-pie';
                bodyContent = `
                    <div class="space-y-4 text-left">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold mb-2">Year</label>
                                <select id="period-year-select" class="w-full text-sm p-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold">
                                    ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold mb-2">Quarter</label>
                                <select id="period-quarter-select" class="w-full text-sm p-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold">
                                    ${quarters.map(q => `<option value="${q.value}">${q.label}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                `;
            } else if (mode === 'annual') {
                title = 'Select Year';
                icon = 'file-invoice-dollar';
                bodyContent = `
                    <div class="space-y-4 text-left">
                        <div>
                            <label class="block text-xs font-bold mb-2">Choose Year</label>
                            <select id="period-year-select" class="w-full text-sm p-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold">
                                ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
            } else {
                title = 'Custom Date Range';
                icon = 'calendar-days';
                const today = new Date().toISOString().split('T')[0];
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const monthAgoStr = monthAgo.toISOString().split('T')[0];
                bodyContent = `
                    <div class="space-y-4 text-left">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold mb-2">Start Date</label>
                                <input type="date" id="period-start-date" value="${this.dateRange.start || monthAgoStr}" max="${today}" class="w-full text-sm p-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold">
                            </div>
                            <div>
                                <label class="block text-xs font-bold mb-2">End Date</label>
                                <input type="date" id="period-end-date" value="${this.dateRange.end || today}" max="${today}" class="w-full text-sm p-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold">
                            </div>
                        </div>
                    </div>
                `;
            }

            A.createModal({
                title, icon, size: 'narrow', body: bodyContent,
                footer: `
                    <button class="btn-secondary" onclick="AdminTreasury.closeFallbackModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminTreasury.submitPeriodPicker('${mode}')"><i class="fa-solid fa-download mr-1"></i> Generate PDF</button>
                `
            });
        },

        async submitPeriodPicker(mode) {
            try {
                if (mode === 'monthly') {
                    const month = document.getElementById('period-month-select')?.value;
                    if (!month) { toast.error('Please select a month'); return; }
                    this.closeFallbackModal();
                    await this.generateMonthlyReport(month);
                } else if (mode === 'quarterly') {
                    const year = document.getElementById('period-year-select')?.value;
                    const quarter = document.getElementById('period-quarter-select')?.value;
                    if (!year || !quarter) { toast.error('Please select year and quarter'); return; }
                    const qMap = { Q1: ['01-01', '03-31'], Q2: ['04-01', '06-30'], Q3: ['07-01', '09-30'], Q4: ['10-01', '12-31'] };
                    const [start, end] = qMap[quarter];
                    this.closeFallbackModal();
                    await this.generateRangeReport(`${year}-${start}`, `${year}-${end}`);
                } else if (mode === 'annual') {
                    const year = document.getElementById('period-year-select')?.value;
                    if (!year) { toast.error('Please select a year'); return; }
                    this.closeFallbackModal();
                    await this.generateRangeReport(`${year}-01-01`, `${year}-12-31`);
                } else {
                    const start = document.getElementById('period-start-date')?.value;
                    const end = document.getElementById('period-end-date')?.value;
                    if (!start || !end) { toast.error('Please select dates'); return; }
                    if (new Date(start) > new Date(end)) { toast.error('Start date must be before end date'); return; }
                    this.closeFallbackModal();
                    await this.generateRangeReport(start, end);
                }
            } catch (e) {
                toast.error('Failed: ' + e.message);
            }
        },

        async quickGenerate(preset) {
            const now = new Date();
            let month;
            if (preset === 'this_month') {
                month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            } else if (preset === 'last_month') {
                const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }
            await this.generateMonthlyReport(month);
        },

        async generateMonthlyReport(month) {
            const monthName = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            toast.info(`Generating report for ${monthName}...`);
            try {
                const response = await fetch(EDGE_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.supabaseClient?.supabaseKey || ''}`
                    },
                    body: JSON.stringify({ type: 'monthly_treasury', month })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Report failed');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Monthly_Treasury_${month}.pdf`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success(`Report for ${monthName} downloaded!`);
            } catch (e) {
                toast.error('Failed: ' + e.message);
            }
        },

        async generateRangeReport(startDate, endDate) {
            toast.info(`Generating statement...`);
            try {
                const response = await fetch(EDGE_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.supabaseClient?.supabaseKey || ''}`
                    },
                    body: JSON.stringify({ type: 'treasury_statement', startDate, endDate })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Report failed');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Treasury_${startDate}_to_${endDate}.pdf`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Statement downloaded!');
            } catch (e) {
                toast.error('Failed: ' + e.message);
            }
        },

        // ============================================
        // TRANSACTION FORM (unchanged logic)
        // ============================================
        async openTransactionForm(txnId) {
            let existing = null;
            if (txnId) {
                const txns = await DB.get('treasury', []);
                existing = txns.find(t => t.id === txnId);
            }
            const today = (A.ymd ? A.ymd() : new Date().toISOString().split('T')[0]);

            A.createModal({
                title: existing ? 'Edit Transaction' : 'New Transaction',
                size: 'wide', icon: 'wallet',
                body: `
                    <form id="txn-form" onsubmit="return false;" class="space-y-5 text-left">
                        <div class="grid grid-cols-2 gap-4">
                            <label class="relative cursor-pointer">
                                <input type="radio" name="txn_type" value="income" class="peer sr-only" ${existing && parseFloat(existing.income) > 0 ? 'checked' : (!existing ? 'checked' : '')} onchange="AdminTreasury.toggleCategories('income')">
                                <div class="p-5 rounded-2xl border-2 border-slate-200/60 dark:border-white/[0.08] peer-checked:border-green-500 peer-checked:bg-green-500/5 transition-all">
                                    <div class="flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-up text-green-500 text-lg"></i></div>
                                        <div><p class="text-sm font-bold">Income</p><p class="text-[10px] text-slate-400">Money received</p></div>
                                    </div>
                                </div>
                            </label>
                            <label class="relative cursor-pointer">
                                <input type="radio" name="txn_type" value="expense" class="peer sr-only" ${existing && parseFloat(existing.expense) > 0 ? 'checked' : ''} onchange="AdminTreasury.toggleCategories('expense')">
                                <div class="p-5 rounded-2xl border-2 border-slate-200/60 dark:border-white/[0.08] peer-checked:border-red-500 peer-checked:bg-red-500/5 transition-all">
                                    <div class="flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-down text-red-500 text-lg"></i></div>
                                        <div><p class="text-sm font-bold">Expense</p><p class="text-[10px] text-slate-400">Money spent</p></div>
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold mb-1">Particular <span class="text-red-500">*</span></label>
                                <input type="text" name="particular" required class="w-full text-xs p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-transparent" value="${A.esc(existing?.particular || '')}" placeholder="e.g., Membership fee">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold mb-1">Description</label>
                                <textarea name="description" rows="2" class="w-full text-xs p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-transparent">${A.esc(existing?.description || '')}</textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-bold mb-1">Date <span class="text-red-500">*</span></label>
                                <input type="date" name="transaction_date" required max="${today}" class="w-full text-xs p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-transparent" value="${existing?.transaction_date || today}">
                            </div>
                            <div>
                                <label class="block text-xs font-bold mb-1">Amount (Rs) <span class="text-red-500">*</span></label>
                                <input type="number" name="amount" required min="0.01" step="0.01" class="w-full text-xs p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-transparent" value="${existing ? (parseFloat(existing.income) || parseFloat(existing.expense) || '') : ''}" placeholder="0.00">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-xs font-bold mb-1">Category <span class="text-red-500">*</span></label>
                                <select name="category" required class="w-full text-xs p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-transparent" id="category-select">
                                    <option value="">Select category...</option>
                                </select>
                            </div>
                        </div>
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="approved" class="w-4 h-4 accent-brand-blue" ${existing ? (existing.approved ? 'checked' : '') : 'checked'}>
                            <div><p class="text-xs font-bold">Mark as Approved</p><p class="text-[10px] text-slate-400">Approved transactions update balances</p></div>
                        </label>
                    </form>
                `,
                footer: `
                    <button class="btn-secondary" onclick="AdminTreasury.closeFallbackModal()">Cancel</button>
                    <button class="btn-primary" onclick="AdminTreasury.submitTransaction('${txnId || ''}')"><i class="fa-solid fa-save mr-1"></i> ${existing ? 'Update' : 'Create'}</button>
                `
            });

            setTimeout(() => {
                const initialType = existing && parseFloat(existing.expense) > 0 ? 'expense' : 'income';
                this.toggleCategories(initialType);
                if (existing?.category) {
                    const sel = document.getElementById('category-select');
                    if (sel) sel.value = existing.category;
                }
            }, 50);
        },

        toggleCategories(type) {
            const sel = document.getElementById('category-select');
            if (!sel) return;
            const cats = type === 'income' ? this.INCOME_CATEGORIES : this.EXPENSE_CATEGORIES;
            sel.innerHTML = '<option value="">Select category...</option>' + cats.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
        },

        async submitTransaction(txnId) {
            const form = document.getElementById('txn-form');
            if (!form) return;
            const fd = new FormData(form);
            const type = fd.get('txn_type');
            const amount = parseFloat(fd.get('amount')) || 0;

            if (!fd.get('particular') || !fd.get('transaction_date') || !fd.get('category') || amount <= 0) {
                A.notify('warning', 'Please fill all required fields.');
                return;
            }

            const user = Auth.currentUser;
            const isApproved = !!fd.get('approved');
            const payload = {
                transaction_date: fd.get('transaction_date'),
                particular: fd.get('particular'),
                description: fd.get('description') || null,
                category: fd.get('category'),
                income: type === 'income' ? amount : 0,
                expense: type === 'expense' ? amount : 0,
                approved: isApproved,
                approved_by: isApproved ? (user?.id || null) : null,
                updated_at: new Date().toISOString()
            };

            try {
                const txns = await DB.get('treasury', []);
                if (txnId) {
                    const idx = txns.findIndex(t => t.id === txnId);
                    if (idx !== -1) txns[idx] = { ...txns[idx], ...payload };
                } else {
                    payload.id = 'txn-' + Date.now();
                    payload.created_at = new Date().toISOString();
                    payload.created_by = user?.id || null;
                    txns.push(payload);
                }
                await DB.set('treasury', txns);
                toast.success(txnId ? 'Updated!' : 'Added!');
                this.closeFallbackModal();
                await this.switchView(this.currentView);
            } catch (e) {
                toast.error('Save failed: ' + e.message);
            }
        },

        async editTransaction(id) { await this.openTransactionForm(id); },

        async approveTransaction(id) {
            try {
                const txns = await DB.get('treasury', []);
                const idx = txns.findIndex(t => t.id === id);
                if (idx !== -1) {
                    txns[idx].approved = true;
                    txns[idx].approved_by = Auth.currentUser?.id || null;
                    await DB.set('treasury', txns);
                }
                toast.success('Approved');
                await this.loadLedgerData();
            } catch (e) {
                toast.error('Failed: ' + e.message);
            }
        },

        async deleteTransaction(id) {
            if (!confirm('Permanently delete this transaction?')) return;
            try {
                await DB.remove(id);
                toast.success('Deleted');
                await this.switchView(this.currentView);
            } catch (e) {
                toast.error('Delete failed: ' + e.message);
            }
        },

        // ============================================
        // DATA FETCHERS
        // ============================================
        async getOverallSummary() {
            try {
                const txns = await DB.get('treasury', DEFAULT_TREASURY_SEED);
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

                let totalIncome = 0, totalExpense = 0, incomeCount = 0, expenseCount = 0;
                let monthlyIncome = 0, monthlyExpense = 0, monthlyTxns = 0;

                txns.forEach(t => {
                    const inc = parseFloat(t.income) || 0;
                    const exp = parseFloat(t.expense) || 0;
                    totalIncome += inc; totalExpense += exp;
                    if (inc > 0) incomeCount++;
                    if (exp > 0) expenseCount++;
                    if (t.transaction_date >= first && t.transaction_date <= last) {
                        monthlyIncome += inc; monthlyExpense += exp; monthlyTxns++;
                    }
                });

                return {
                    totalIncome, totalExpense,
                    balance: totalIncome - totalExpense,
                    incomeCount, expenseCount,
                    monthlyIncome, monthlyExpense,
                    monthlyNet: monthlyIncome - monthlyExpense,
                    monthlyTxns
                };
            } catch (e) {
                return { totalIncome: 0, totalExpense: 0, balance: 0, incomeCount: 0, expenseCount: 0, monthlyIncome: 0, monthlyExpense: 0, monthlyNet: 0, monthlyTxns: 0 };
            }
        },

        async getMonthlyTrends(months = 6) {
            try {
                const now = new Date();
                const txns = await DB.get('treasury', []);
                const trends = {};
                for (let i = months - 1; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const key = d.toISOString().substring(0, 7);
                    trends[key] = { label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), income: 0, expense: 0 };
                }
                txns.forEach(t => {
                    const key = (t.transaction_date || '').substring(0, 7);
                    if (trends[key]) {
                        trends[key].income += parseFloat(t.income) || 0;
                        trends[key].expense += parseFloat(t.expense) || 0;
                    }
                });
                return Object.values(trends);
            } catch (e) { return []; }
        },

        async getLatestTransactions(limit = 5) {
            try {
                const txns = await DB.get('treasury', []);
                return txns.sort((a, b) => {
                    const dateDiff = new Date(b.transaction_date) - new Date(a.transaction_date);
                    if (dateDiff !== 0) return dateDiff;
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }).slice(0, limit);
            } catch (e) { return []; }
        },

        async getCategoryBreakdown() {
            try {
                const txns = await DB.get('treasury', []);
                const income = {}, expense = {};
                txns.forEach(t => {
                    const inc = parseFloat(t.income) || 0;
                    const exp = parseFloat(t.expense) || 0;
                    if (inc > 0) {
                        income[t.category] = income[t.category] || { total: 0, count: 0 };
                        income[t.category].total += inc; income[t.category].count++;
                    }
                    if (exp > 0) {
                        expense[t.category] = expense[t.category] || { total: 0, count: 0 };
                        expense[t.category].total += exp; expense[t.category].count++;
                    }
                });
                return { income, expense };
            } catch (e) { return { income: {}, expense: {} }; }
        },

        async getYearlyComparison() {
            try {
                const now = new Date();
                const currentYear = now.getFullYear();
                const txns = await DB.get('treasury', []);
                const result = {};
                for (let y = currentYear - 2; y <= currentYear; y++) result[y] = { income: 0, expense: 0 };
                txns.forEach(t => {
                    const year = parseInt((t.transaction_date || '').substring(0, 4));
                    if (result[year]) {
                        result[year].income += parseFloat(t.income) || 0;
                        result[year].expense += parseFloat(t.expense) || 0;
                    }
                });
                return result;
            } catch (e) { return {}; }
        },

        async getCategoryTrends() {
            const breakdown = await this.getCategoryBreakdown();
            const sortByTotal = (obj) => Object.entries(obj).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
            return { income: sortByTotal(breakdown.income), expense: sortByTotal(breakdown.expense) };
        },

        async getTopTransactions(limit = 10) {
            try {
                const txns = await DB.get('treasury', []);
                return txns.sort((a, b) => {
                    const maxA = Math.max(parseFloat(a.income) || 0, parseFloat(a.expense) || 0);
                    const maxB = Math.max(parseFloat(b.income) || 0, parseFloat(b.expense) || 0);
                    return maxB - maxA;
                }).slice(0, limit);
            } catch (e) { return []; }
        },

        // ============================================
        // CHART RENDERERS
        // ============================================
        renderBarChart(data, large = false) {
            if (!data || data.length === 0) return '<div class="text-center py-12 text-xs text-slate-400">No data</div>';
            const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense))) || 1;
            const height = large ? 240 : 180;
            return `
                <div class="flex items-end justify-around gap-2" style="height:${height}px;padding:16px 8px 32px;position:relative;">
                    ${data.map(d => {
                        const incH = (d.income / maxVal) * (height - 60);
                        const expH = (d.expense / maxVal) * (height - 60);
                        return `
                            <div class="flex-1 flex flex-col items-center gap-1 relative" style="max-width:60px;">
                                <div class="flex items-end gap-1 w-full justify-center" style="height:${height - 50}px;">
                                    <div class="chart-bar flex-1" style="height:${incH}px;background:linear-gradient(to top, #16a34a, #22c55e);"></div>
                                    <div class="chart-bar flex-1" style="height:${expH}px;background:linear-gradient(to top, #dc2626, #ef4444);"></div>
                                </div>
                                <p class="text-[9px] font-bold text-slate-500 whitespace-nowrap">${d.label}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        renderCategoryBreakdown(breakdown) {
            const sorted = Object.entries(breakdown.expense).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
            if (sorted.length === 0) return '<div class="text-center py-12 text-xs text-slate-400">No data</div>';
            const max = sorted[0][1].total;
            return `
                <div class="space-y-3 pt-4">
                    ${sorted.map(([cat, data]) => {
                        const info = this.getCategoryInfo(cat);
                        const percent = (data.total / max) * 100;
                        return `
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-[11px] font-bold flex items-center gap-1.5"><i class="fa-solid ${info.icon} text-[10px]" style="color:${info.color};"></i>${info.label}</span>
                                    <span class="text-[11px] font-black">${this.money(data.total)}</span>
                                </div>
                                <div class="w-full h-2 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                                    <div style="width:${percent}%;height:100%;background:${info.color};border-radius:9999px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        renderYearlyComparison(data) {
            const years = Object.keys(data).sort();
            if (years.length === 0) return '<div class="text-center py-12 text-xs text-slate-400">No data</div>';
            return `
                <div class="space-y-4 pt-2">
                    ${years.map(year => {
                        const d = data[year];
                        const net = d.income - d.expense;
                        return `
                            <div class="p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08]">
                                <div class="flex items-center justify-between mb-3">
                                    <h4 class="text-sm font-black">${year}</h4>
                                    <span class="text-xs font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}">${net >= 0 ? '+' : ''}${this.money(net)}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-2 text-[11px]">
                                    <div><span class="text-slate-400">Income:</span> <strong class="text-green-600">${this.money(d.income)}</strong></div>
                                    <div><span class="text-slate-400">Expense:</span> <strong class="text-red-600">${this.money(d.expense)}</strong></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        renderCategoryList(data, type) {
            if (!data || data.length === 0) return '<div class="text-center py-12 text-xs text-slate-400">No data</div>';
            const total = data.reduce((s, [, d]) => s + d.total, 0);
            return `
                <div class="space-y-3">
                    ${data.map(([cat, d]) => {
                        const info = this.getCategoryInfo(cat);
                        const percent = total > 0 ? (d.total / total * 100) : 0;
                        return `
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${info.color}18;"><i class="fa-solid ${info.icon}" style="color:${info.color};"></i></div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between mb-1">
                                        <p class="text-xs font-bold truncate">${info.label}</p>
                                        <p class="text-xs font-black ${type === 'income' ? 'text-green-600' : 'text-red-600'}">${this.money(d.total)}</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1 h-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                                            <div style="width:${percent}%;height:100%;background:${info.color};"></div>
                                        </div>
                                        <span class="text-[9px] text-slate-400 font-bold w-10 text-right">${percent.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        // ============================================
        // EXPORT MENU
        // ============================================
        showExportMenu() {
            A.createModal({
                title: 'Export Treasury Data', size: 'narrow', icon: 'download',
                body: `
                    <div class="space-y-3 text-left">
                        <button class="w-full p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-green-500 hover:bg-green-500/5 transition-all flex items-center gap-4" onclick="AdminTreasury.exportToExcel(); AdminTreasury.closeFallbackModal();">
                            <div class="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center"><i class="fa-solid fa-file-excel text-green-600 text-lg"></i></div>
                            <div class="flex-1 text-left"><p class="text-sm font-bold">Excel Workbook</p><p class="text-[11px] text-slate-500">3-sheet branded financial workbook</p></div>
                        </button>
                        <button class="w-full p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-blue-500 hover:bg-blue-500/5 transition-all flex items-center gap-4" onclick="AdminTreasury.closeFallbackModal(); AdminTreasury.openPeriodPicker('monthly');">
                            <div class="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center"><i class="fa-solid fa-calendar-days text-blue-600 text-lg"></i></div>
                            <div class="flex-1 text-left"><p class="text-sm font-bold">Monthly PDF Report</p><p class="text-[11px] text-slate-500">Select month with full insights</p></div>
                        </button>
                        <button class="w-full p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-red-500 hover:bg-red-500/5 transition-all flex items-center gap-4" onclick="AdminTreasury.closeFallbackModal(); AdminTreasury.openPeriodPicker('range');">
                            <div class="w-11 h-11 rounded-lg bg-red-500/10 flex items-center justify-center"><i class="fa-solid fa-file-pdf text-red-600 text-lg"></i></div>
                            <div class="flex-1 text-left"><p class="text-sm font-bold">Custom Range PDF</p><p class="text-[11px] text-slate-500">Any date range statement</p></div>
                        </button>
                    </div>
                `,
                footer: `<button class="btn-secondary" onclick="AdminTreasury.closeFallbackModal()">Close</button>`
            });
        },

        // ============================================
        // PREMIUM EXCEL EXPORT - FULLY REBUILT
        // ============================================
        async exportToExcel() {
            toast.info('Preparing Excel workbook...');
            try {
                await LibLoader.loadExcelJS();

                const txns = await DB.get('treasury', []);
                const sorted = [...txns].sort((a, b) => {
                    const d = new Date(a.transaction_date) - new Date(b.transaction_date);
                    if (d !== 0) return d;
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                });
                const summary = await this.getOverallSummary();
                const breakdown = await this.getCategoryBreakdown();

                const workbook = new ExcelJS.Workbook();
                workbook.creator = CLUB_INFO.name;
                workbook.lastModifiedBy = Auth.currentUser?.name || 'Treasurer';
                workbook.created = new Date();
                workbook.modified = new Date();
                workbook.company = CLUB_INFO.name;

                // Attempt to load logo (optional)
                let logoId = null;
                try {
                    const logoBase64 = await LibLoader.fetchLogoAsBase64();
                    if (logoBase64) {
                        logoId = workbook.addImage({
                            base64: logoBase64,
                            extension: 'png'
                        });
                    }
                } catch (e) {
                    console.warn('Logo load failed, continuing without:', e);
                }

                // ====================================
                // SHEET 1: DASHBOARD OVERVIEW
                // ====================================
                const sheet1 = workbook.addWorksheet('Dashboard', {
                    properties: { tabColor: { argb: CLUB_INFO.colors.cranberry } },
                    pageSetup: {
                        paperSize: 9,
                        orientation: 'portrait',
                        margins: { left: 0.5, right: 0.5, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
                        fitToPage: true,
                        fitToWidth: 1
                    }
                });

                sheet1.columns = [
                    { width: 4 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }
                ];

                // Add logo if available
                if (logoId !== null) {
                    sheet1.addImage(logoId, {
                        tl: { col: 1.5, row: 0.3 },
                        ext: { width: 350, height: 32 }
                    });
                    sheet1.getRow(1).height = 50;
                    sheet1.getRow(2).height = 10;
                }

                let r = logoId !== null ? 3 : 1;

                // Club Name
                sheet1.mergeCells(r, 1, r, 6);
                const titleCell = sheet1.getCell(r, 1);
                titleCell.value = CLUB_INFO.name;
                titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: CLUB_INFO.colors.cranberry } };
                titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet1.getRow(r).height = 28;
                r++;

                // Parent & District
                sheet1.mergeCells(r, 1, r, 6);
                const parentCell = sheet1.getCell(r, 1);
                parentCell.value = `${CLUB_INFO.parent}  |  Club ID: ${CLUB_INFO.clubId}  |  ${CLUB_INFO.district}`;
                parentCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: CLUB_INFO.colors.gray } };
                parentCell.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet1.getRow(r).height = 18;
                r++;

                // Divider
                sheet1.mergeCells(r, 1, r, 6);
                sheet1.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.cranberry } };
                sheet1.getRow(r).height = 3;
                r += 2;

                // Report Title
                sheet1.mergeCells(r, 1, r, 6);
                const reportTitle = sheet1.getCell(r, 1);
                reportTitle.value = 'TREASURY FINANCIAL DASHBOARD';
                reportTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
                reportTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                reportTitle.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet1.getRow(r).height = 24;
                r++;

                // Generation Date
                sheet1.mergeCells(r, 1, r, 6);
                const dateCell = sheet1.getCell(r, 1);
                dateCell.value = `Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}  |  Prepared by: ${Auth.currentUser?.name || 'Treasurer'}`;
                dateCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: CLUB_INFO.colors.gray } };
                dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.light } };
                dateCell.alignment = { horizontal: 'center' };
                sheet1.getRow(r).height = 18;
                r += 2;

                // KPI Cards (4 cards across columns 2-5)
                const kpis = [
                    { label: 'TOTAL INCOME', value: summary.totalIncome, color: CLUB_INFO.colors.success, bg: CLUB_INFO.colors.pastelGreen, count: `${summary.incomeCount} txns` },
                    { label: 'TOTAL EXPENSE', value: summary.totalExpense, color: CLUB_INFO.colors.danger, bg: CLUB_INFO.colors.pastelRed, count: `${summary.expenseCount} txns` },
                    { label: 'NET BALANCE', value: summary.balance, color: summary.balance >= 0 ? CLUB_INFO.colors.navy : CLUB_INFO.colors.danger, bg: summary.balance >= 0 ? CLUB_INFO.colors.pastelBlue : CLUB_INFO.colors.pastelRed, count: summary.balance >= 0 ? 'Surplus' : 'Deficit' },
                    { label: 'MONTHLY NET', value: summary.monthlyNet, color: summary.monthlyNet >= 0 ? CLUB_INFO.colors.purple : CLUB_INFO.colors.danger, bg: summary.monthlyNet >= 0 ? CLUB_INFO.colors.pastelPurple : CLUB_INFO.colors.pastelRed, count: `${summary.monthlyTxns} this month` }
                ];

                // KPI Label Row
                kpis.forEach((kpi, idx) => {
                    const col = idx + 2;
                    const labelCell = sheet1.getCell(r, col);
                    labelCell.value = kpi.label;
                    labelCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: CLUB_INFO.colors.gray } };
                    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
                    labelCell.border = {
                        top: { style: 'medium', color: { argb: kpi.color } },
                        left: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        right: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };
                });
                sheet1.getRow(r).height = 22;
                r++;

                // KPI Value Row
                kpis.forEach((kpi, idx) => {
                    const col = idx + 2;
                    const valueCell = sheet1.getCell(r, col);
                    valueCell.value = kpi.value;
                    valueCell.numFmt = '"₹"#,##0.00';
                    valueCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: kpi.color } };
                    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
                    valueCell.border = {
                        left: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        right: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };
                });
                sheet1.getRow(r).height = 32;
                r++;

                // KPI Subtitle Row
                kpis.forEach((kpi, idx) => {
                    const col = idx + 2;
                    const subCell = sheet1.getCell(r, col);
                    subCell.value = kpi.count;
                    subCell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: CLUB_INFO.colors.grayLight } };
                    subCell.alignment = { horizontal: 'center' };
                    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
                    subCell.border = {
                        bottom: { style: 'medium', color: { argb: kpi.color } },
                        left: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        right: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };
                });
                sheet1.getRow(r).height = 16;
                r += 2;

                // Statistics Section Header
                sheet1.mergeCells(r, 2, r, 5);
                const statsHeader = sheet1.getCell(r, 2);
                statsHeader.value = '  TRANSACTION STATISTICS';
                statsHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                statsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
                sheet1.getRow(r).height = 22;
                r++;

                const stats = [
                    ['Total Transactions', summary.incomeCount + summary.expenseCount, false],
                    ['Income Transactions', summary.incomeCount, false],
                    ['Expense Transactions', summary.expenseCount, false],
                    ['This Month Income', summary.monthlyIncome, true],
                    ['This Month Expense', summary.monthlyExpense, true],
                    ['This Month Net', summary.monthlyNet, true]
                ];

                stats.forEach(([label, value, isCurrency], idx) => {
                    const bgColor = idx % 2 === 0 ? CLUB_INFO.colors.light : CLUB_INFO.colors.white;

                    // Label columns (merged 2-3)
                    sheet1.mergeCells(r, 2, r, 3);
                    const lblCell = sheet1.getCell(r, 2);
                    lblCell.value = label;
                    lblCell.font = { name: 'Calibri', size: 10, bold: true };
                    lblCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                    lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    lblCell.border = {
                        bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        left: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };

                    // Value columns (merged 4-5)
                    sheet1.mergeCells(r, 4, r, 5);
                    const valCell = sheet1.getCell(r, 4);
                    valCell.value = value;
                    if (isCurrency) valCell.numFmt = '"₹"#,##0.00';
                    valCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CLUB_INFO.colors.navy } };
                    valCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
                    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    valCell.border = {
                        bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        right: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };

                    sheet1.getRow(r).height = 20;
                    r++;
                });

                r += 2;
                sheet1.mergeCells(r, 2, r, 5);
                const footerCell = sheet1.getCell(r, 2);
                footerCell.value = `This is a system-generated report  •  ${CLUB_INFO.website}`;
                footerCell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: CLUB_INFO.colors.grayLight } };
                footerCell.alignment = { horizontal: 'center' };

                // ====================================
                // SHEET 2: GENERAL LEDGER
                // ====================================
                const sheet2 = workbook.addWorksheet('General Ledger', {
                    properties: { tabColor: { argb: CLUB_INFO.colors.navy } },
                    pageSetup: {
                        paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1,
                        margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
                    }
                });

                sheet2.columns = [
                    { key: 'sno', width: 8 },
                    { key: 'date', width: 14 },
                    { key: 'particular', width: 40 },
                    { key: 'description', width: 28 },
                    { key: 'category', width: 22 },
                    { key: 'income', width: 16 },
                    { key: 'expense', width: 16 },
                    { key: 'balance', width: 18 },
                    { key: 'status', width: 12 }
                ];

                // Branded header on ledger
                sheet2.mergeCells('A1:I1');
                const lHeader = sheet2.getCell('A1');
                lHeader.value = CLUB_INFO.name;
                lHeader.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
                lHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.cranberry } };
                lHeader.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet2.getRow(1).height = 28;

                sheet2.mergeCells('A2:I2');
                const lSub = sheet2.getCell('A2');
                lSub.value = `GENERAL LEDGER  |  ${CLUB_INFO.district}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`;
                lSub.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' }, italic: true };
                lSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                lSub.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet2.getRow(2).height = 20;

                // Table Headers (row 4)
                const headers = ['S.No', 'Date', 'Particular', 'Description', 'Category', 'Income (₹)', 'Expense (₹)', 'Balance (₹)', 'Status'];
                const headerRow = sheet2.getRow(4);
                headers.forEach((h, i) => {
                    const c = headerRow.getCell(i + 1);
                    c.value = h;
                    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    c.border = {
                        top: { style: 'medium', color: { argb: CLUB_INFO.colors.navy } },
                        bottom: { style: 'medium', color: { argb: CLUB_INFO.colors.navy } },
                        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
                    };
                });
                headerRow.height = 30;

                // Data rows
                let currentRow = 5;
                sorted.forEach((t, i) => {
                    const income = parseFloat(t.income) || 0;
                    const expense = parseFloat(t.expense) || 0;
                    const balance = parseFloat(t.balance) || 0;
                    const isIncome = income > 0;
                    const cat = this.getCategoryInfo(t.category);
                    const row = sheet2.getRow(currentRow);

                    const rowBg = isIncome ? CLUB_INFO.colors.pastelGreen : CLUB_INFO.colors.pastelRed;
                    const altBg = i % 2 === 0 ? rowBg : CLUB_INFO.colors.white;

                    // S.No
                    row.getCell(1).value = i + 1;
                    row.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: CLUB_INFO.colors.gray } };
                    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

                    // Date
                    row.getCell(2).value = new Date(t.transaction_date);
                    row.getCell(2).numFmt = 'dd-mmm-yyyy';
                    row.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
                    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

                    // Particular
                    row.getCell(3).value = t.particular || '';
                    row.getCell(3).font = { name: 'Calibri', size: 9, bold: true, color: { argb: CLUB_INFO.colors.darkText } };
                    row.getCell(3).alignment = { vertical: 'middle', wrapText: true };

                    // Description
                    row.getCell(4).value = t.description || '';
                    row.getCell(4).font = { name: 'Calibri', size: 9, italic: true, color: { argb: CLUB_INFO.colors.gray } };
                    row.getCell(4).alignment = { vertical: 'middle', wrapText: true };

                    // Category
                    row.getCell(5).value = cat.label;
                    row.getCell(5).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + cat.color.replace('#', '').toUpperCase() } };
                    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

                    // Income
                    row.getCell(6).value = income > 0 ? income : null;
                    row.getCell(6).numFmt = '"₹"#,##0.00;;"—"';
                    row.getCell(6).font = { name: 'Calibri', size: 9, bold: income > 0, color: { argb: income > 0 ? CLUB_INFO.colors.success : CLUB_INFO.colors.grayLight } };
                    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };

                    // Expense
                    row.getCell(7).value = expense > 0 ? expense : null;
                    row.getCell(7).numFmt = '"₹"#,##0.00;;"—"';
                    row.getCell(7).font = { name: 'Calibri', size: 9, bold: expense > 0, color: { argb: expense > 0 ? CLUB_INFO.colors.danger : CLUB_INFO.colors.grayLight } };
                    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

                    // Balance
                    row.getCell(8).value = balance;
                    row.getCell(8).numFmt = '"₹"#,##0.00';
                    row.getCell(8).font = { name: 'Calibri', size: 9, bold: true, color: { argb: balance >= 0 ? CLUB_INFO.colors.navy : CLUB_INFO.colors.danger } };
                    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

                    // Status
                    row.getCell(9).value = t.approved ? 'Approved' : 'Pending';
                    row.getCell(9).font = { name: 'Calibri', size: 9, bold: true, color: { argb: t.approved ? CLUB_INFO.colors.success : CLUB_INFO.colors.warning } };
                    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

                    // Apply background and borders to all cells
                    for (let col = 1; col <= 9; col++) {
                        const c = row.getCell(col);
                        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altBg } };
                        c.border = {
                            top: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                            bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                            left: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                            right: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                        };
                    }

                    row.height = 24;
                    currentRow++;
                });

                // Totals row
                const totalIncome = sorted.reduce((s, t) => s + (parseFloat(t.income) || 0), 0);
                const totalExpense = sorted.reduce((s, t) => s + (parseFloat(t.expense) || 0), 0);
                const netBalance = totalIncome - totalExpense;

                const totalRow = sheet2.getRow(currentRow);
                totalRow.getCell(1).value = '';
                totalRow.getCell(2).value = '';
                totalRow.getCell(3).value = 'GRAND TOTAL';
                totalRow.getCell(4).value = '';
                totalRow.getCell(5).value = '';
                totalRow.getCell(6).value = totalIncome;
                totalRow.getCell(7).value = totalExpense;
                totalRow.getCell(8).value = netBalance;
                totalRow.getCell(9).value = '';

                for (let col = 1; col <= 9; col++) {
                    const c = totalRow.getCell(col);
                    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                    c.border = {
                        top: { style: 'double', color: { argb: CLUB_INFO.colors.cranberry } },
                        bottom: { style: 'double', color: { argb: CLUB_INFO.colors.cranberry } }
                    };
                    if (col === 3) c.alignment = { horizontal: 'right', vertical: 'middle' };
                    if (col === 6 || col === 7 || col === 8) {
                        c.numFmt = '"₹"#,##0.00';
                        c.alignment = { horizontal: 'right', vertical: 'middle' };
                    }
                }
                totalRow.height = 30;

                // Freeze header
                sheet2.views = [{ state: 'frozen', ySplit: 4 }];

                // Auto filter
                sheet2.autoFilter = {
                    from: { row: 4, column: 1 },
                    to: { row: 4, column: 9 }
                };

                // ====================================
                // SHEET 3: CATEGORY ANALYSIS
                // ====================================
                const sheet3 = workbook.addWorksheet('Category Analysis', {
                    properties: { tabColor: { argb: CLUB_INFO.colors.gold } }
                });

                sheet3.columns = [
                    { width: 4 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 15 }
                ];

                sheet3.mergeCells('A1:E1');
                const c3h = sheet3.getCell('A1');
                c3h.value = `${CLUB_INFO.name} — CATEGORY-WISE ANALYSIS`;
                c3h.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
                c3h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.cranberry } };
                c3h.alignment = { horizontal: 'center', vertical: 'middle' };
                sheet3.getRow(1).height = 26;

                let cr = 3;

                // Income Categories
                sheet3.mergeCells(cr, 2, cr, 5);
                const incH = sheet3.getCell(cr, 2);
                incH.value = '  💰 INCOME CATEGORIES';
                incH.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                incH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.success } };
                incH.alignment = { horizontal: 'left', vertical: 'middle' };
                sheet3.getRow(cr).height = 22;
                cr++;

                // Income headers
                ['Category', 'Transactions', 'Total Amount', '% of Income'].forEach((h, i) => {
                    const c = sheet3.getCell(cr, i + 2);
                    c.value = h;
                    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                    c.border = {
                        top: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };
                });
                sheet3.getRow(cr).height = 22;
                cr++;

                this.INCOME_CATEGORIES.forEach((cat, idx) => {
                    const data = breakdown.income[cat.value] || { total: 0, count: 0 };
                    const percent = totalIncome > 0 ? (data.total / totalIncome * 100) : 0;
                    const bg = idx % 2 === 0 ? CLUB_INFO.colors.light : CLUB_INFO.colors.white;

                    // Category label
                    const c1 = sheet3.getCell(cr, 2);
                    c1.value = cat.label;
                    c1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + cat.color.replace('#', '').toUpperCase() } };
                    c1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c1.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    // Count
                    const c2 = sheet3.getCell(cr, 3);
                    c2.value = data.count;
                    c2.font = { name: 'Calibri', size: 10 };
                    c2.alignment = { horizontal: 'center', vertical: 'middle' };
                    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c2.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    // Amount
                    const c3c = sheet3.getCell(cr, 4);
                    c3c.value = data.total;
                    c3c.numFmt = '"₹"#,##0.00';
                    c3c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CLUB_INFO.colors.success } };
                    c3c.alignment = { horizontal: 'right', vertical: 'middle' };
                    c3c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c3c.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    // Percent
                    const c4 = sheet3.getCell(cr, 5);
                    c4.value = percent / 100;
                    c4.numFmt = '0.00%';
                    c4.font = { name: 'Calibri', size: 10, bold: true };
                    c4.alignment = { horizontal: 'center', vertical: 'middle' };
                    c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c4.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    sheet3.getRow(cr).height = 20;
                    cr++;
                });

                cr += 2;

                // Expense Categories
                sheet3.mergeCells(cr, 2, cr, 5);
                const expH = sheet3.getCell(cr, 2);
                expH.value = '  💸 EXPENSE CATEGORIES';
                expH.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                expH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.danger } };
                expH.alignment = { horizontal: 'left', vertical: 'middle' };
                sheet3.getRow(cr).height = 22;
                cr++;

                ['Category', 'Transactions', 'Total Amount', '% of Expense'].forEach((h, i) => {
                    const c = sheet3.getCell(cr, i + 2);
                    c.value = h;
                    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLUB_INFO.colors.navy } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                    c.border = {
                        top: { style: 'thin', color: { argb: CLUB_INFO.colors.border } },
                        bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } }
                    };
                });
                sheet3.getRow(cr).height = 22;
                cr++;

                this.EXPENSE_CATEGORIES.forEach((cat, idx) => {
                    const data = breakdown.expense[cat.value] || { total: 0, count: 0 };
                    const percent = totalExpense > 0 ? (data.total / totalExpense * 100) : 0;
                    const bg = idx % 2 === 0 ? CLUB_INFO.colors.light : CLUB_INFO.colors.white;

                    const c1 = sheet3.getCell(cr, 2);
                    c1.value = cat.label;
                    c1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + cat.color.replace('#', '').toUpperCase() } };
                    c1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c1.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    const c2 = sheet3.getCell(cr, 3);
                    c2.value = data.count;
                    c2.font = { name: 'Calibri', size: 10 };
                    c2.alignment = { horizontal: 'center', vertical: 'middle' };
                    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c2.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    const c3c = sheet3.getCell(cr, 4);
                    c3c.value = data.total;
                    c3c.numFmt = '"₹"#,##0.00';
                    c3c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CLUB_INFO.colors.danger } };
                    c3c.alignment = { horizontal: 'right', vertical: 'middle' };
                    c3c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c3c.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    const c4 = sheet3.getCell(cr, 5);
                    c4.value = percent / 100;
                    c4.numFmt = '0.00%';
                    c4.font = { name: 'Calibri', size: 10, bold: true };
                    c4.alignment = { horizontal: 'center', vertical: 'middle' };
                    c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    c4.border = { bottom: { style: 'thin', color: { argb: CLUB_INFO.colors.border } } };

                    sheet3.getRow(cr).height = 20;
                    cr++;
                });

                // ====================================
                // DOWNLOAD
                // ====================================
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                const fileName = `${CLUB_INFO.shortName.replace(/\s/g, '_')}_Treasury_${new Date().toISOString().split('T')[0]}.xlsx`;
                saveAs(blob, fileName);

                toast.success('Excel workbook downloaded successfully!');
            } catch (e) {
                console.error('Excel export error:', e);
                toast.error('Excel export failed: ' + e.message);
            }
        },

        // ============================================
        // FILTER & UTILITY HANDLERS
        // ============================================
        onSearchChange(val) {
            clearTimeout(this._searchTimer);
            this._searchTimer = setTimeout(() => {
                this.searchQuery = val;
                this.currentPage = 1;
                this.loadLedgerData();
            }, 400);
        },

        onTypeFilter(val) { this.typeFilter = val; this.currentPage = 1; this.loadLedgerData(); },
        onCategoryFilter(val) { this.categoryFilter = val; this.currentPage = 1; this.loadLedgerData(); },
        onDateRangeChange() {
            this.dateRange.start = document.getElementById('date-start')?.value || null;
            this.dateRange.end = document.getElementById('date-end')?.value || null;
            this.currentPage = 1;
            this.loadLedgerData();
        },
        clearFilters() {
            this.searchQuery = ''; this.typeFilter = 'all'; this.categoryFilter = 'all';
            this.dateRange = { start: null, end: null }; this.currentPage = 1;
            ['txn-search', 'type-filter', 'category-filter', 'date-start', 'date-end'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = id.includes('filter') ? 'all' : '';
            });
            this.loadLedgerData();
        },
        goToPage(page) { if (page < 1) return; this.currentPage = page; this.loadLedgerData(); },
        toggleSelectAll(checked) {
            this.selectedRows = [];
            document.querySelectorAll('.admin-data-table tbody input[type="checkbox"]').forEach(cb => {
                cb.checked = checked;
                const row = cb.closest('tr');
                const id = row ? row.getAttribute('data-id') : null;
                if (checked && id) this.selectedRows.push(id);
            });
        },
        toggleRowSelection(id, checked) {
            if (checked) {
                if (!this.selectedRows.includes(id)) this.selectedRows.push(id);
            } else {
                this.selectedRows = this.selectedRows.filter(r => r !== id);
            }
        },

        money(amount) {
            const num = parseFloat(amount) || 0;
            return 'Rs. ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        getCategoryInfo(slug) {
            const all = [...this.INCOME_CATEGORIES, ...this.EXPENSE_CATEGORIES];
            return all.find(c => c.value === slug) || { label: slug || 'Uncategorized', icon: 'fa-tag', color: '#64748b' };
        },

        getBudgetForCategory(cat) {
            const budgets = {
                event_expense: 50000, operations: 15000, printing_stationery: 5000,
                travel: 10000, food_refreshments: 20000, awards_recognition: 10000,
                donation_given: 25000, district_dues: 15000, bank_charges: 2000,
                marketing: 10000, venue_rental: 20000, equipment: 10000, misc_expense: 5000
            };
            return budgets[cat] || 10000;
        },

        closeFallbackModal() {
            if (window.AdminPanel && typeof window.AdminPanel.closeModal === 'function') {
                window.AdminPanel.closeModal();
            } else {
                A.closeModal();
            }
        },

        renderUnauthorized() {
            return `
                <div class="p-6">
                    <div class="empty-state py-20 text-center">
                        <i class="fa-solid fa-lock empty-state-icon text-red-500 text-3xl mb-4"></i>
                        <h4 class="empty-state-title font-bold text-lg">Access Restricted</h4>
                        <p class="empty-state-desc text-xs text-slate-500">You do not have permission to view treasury data.</p>
                    </div>
                </div>
            `;
        }
    };

    window.AdminTreasury = AdminTreasury;
})();