import { Utils } from '../utils.js';

await Utils.checkAuth();

const companyId = Number(localStorage.getItem('current-company-id'));
const token = localStorage.getItem('token');
const API = 'http://localhost:3000';

const summaryGrid = document.getElementById('summary-grid');
const accountsBody = document.getElementById('accounts-body');
const accountsEmpty = document.getElementById('accounts-empty');
const accountPlaceholder = document.getElementById('account-placeholder');
const accountDetail = document.getElementById('account-detail');
const accountNameEl = document.getElementById('account-name');
const accountMetaEl = document.getElementById('account-meta');
const accountMetadata = document.getElementById('account-metadata');
const ledgerList = document.getElementById('ledger-list');
const ledgerEmpty = document.getElementById('ledger-empty');

const loansBody = document.getElementById('loans-body');
const loansEmpty = document.getElementById('loans-empty');
const loanPlaceholder = document.getElementById('loan-placeholder');
const loanDetail = document.getElementById('loan-detail');
const loanTitle = document.getElementById('loan-title');
const loanSubtitle = document.getElementById('loan-subtitle');
const loanMetadata = document.getElementById('loan-metadata');
const installmentList = document.getElementById('installment-list');

const newAccountBtn = document.getElementById('new-account-btn');
const emptyCreateAccountBtn = document.getElementById('empty-create-account-btn');
const applyLoanBtn = document.getElementById('apply-loan-btn');
const accountModalBackdrop = document.getElementById('account-modal-backdrop');
const loanModalBackdrop = document.getElementById('loan-modal-backdrop');
const accountNameInput = document.getElementById('account-name-input');
const accountModalError = document.getElementById('account-modal-error');
const createAccountBtn = document.getElementById('create-account-btn');
const loanAccountSelect = document.getElementById('loan-account-select');
const loanTypeSelect = document.getElementById('loan-type-select');
const loanAmountInput = document.getElementById('loan-amount-input');
const loanTermSelect = document.getElementById('loan-term-select');
const loanModalRate = document.getElementById('loan-modal-rate');
const loanModalError = document.getElementById('loan-modal-error');
const submitLoanBtn = document.getElementById('submit-loan-btn');

const state = {
    accounts: [],
    loans: [],
    creditScore: null,
    interestRate: null,
    selectedAccountIban: null,
    selectedLoanId: null
};

let sidebarOpen = false;
const sidebar = document.getElementById('sidebar');

function openSidebar() {
    if (!sidebarOpen) {
        sidebar.classList.add('sidebar-responsive');
        sidebarOpen = true;
    }
}

function closeSidebar() {
    if (sidebarOpen) {
        sidebar.classList.remove('sidebar-responsive');
        sidebarOpen = false;
    }
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers ?? {})
        }
    });

    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const data = await response.json();
            message = data.message ?? message;
        } catch {
            // ignore parse errors
        }
        throw new Error(message);
    }

    return response.json();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(Number(value ?? 0));
}

function formatDate(date) {
    if (!date) return '—';

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';

    return new Intl.DateTimeFormat('de-AT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(parsed);
}

function formatDateTime(date) {
    if (!date) return '—';

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';

    return new Intl.DateTimeFormat('de-AT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}

function formatIban(iban) {
    return String(iban ?? '').replace(/(.{4})/g, '$1 ').trim();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function getCreditScoreLabel(score) {
    if (score >= 750) return { text: 'Excellent', className: 'excellent' };
    if (score >= 650) return { text: 'Good', className: 'good' };
    if (score >= 550) return { text: 'Fair', className: 'fair' };
    return { text: 'Poor', className: 'poor' };
}

function normalizePaymentStatus(status) {
    const normalized = String(status ?? '').trim().toUpperCase().replaceAll(' ', '_');
    if (normalized === 'PAYED' || normalized === 'PAID') return 'PAID';
    if (normalized === 'OVERDUE') return 'OVERDUE';
    return 'PENDING';
}

function paymentStatusClass(status) {
    const normalized = normalizePaymentStatus(status);
    if (normalized === 'PAID') return 'paid';
    if (normalized === 'OVERDUE') return 'overdue';
    return 'pending';
}

function loanStatusClass(status) {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'PAID_OFF') return 'paid';
    if (normalized === 'DEFAULTED') return 'overdue';
    return 'pending';
}

function formatLoanType(type) {
    return String(type ?? '')
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

async function loadAccounts() {
    state.accounts = await apiFetch(`/bank/accounts?companyId=${companyId}`);
}

async function loadLoans() {
    state.loans = await apiFetch(`/bank/loans?companyId=${companyId}`);
}

async function loadCreditInfo() {
    const [scoreData, rateData] = await Promise.all([
        apiFetch(`/bank/credit-score?companyId=${companyId}`),
        apiFetch(`/bank/interest-rate?companyId=${companyId}`)
    ]);

    state.creditScore = Number(scoreData.creditScore ?? 0);
    state.interestRate = Number(rateData.interestRate ?? 0);
}

async function loadLedger(iban) {
    const data = await apiFetch(`/bank/accounts/${encodeURIComponent(iban)}/ledger?companyId=${companyId}`);
    return data.ledgerEntries ?? [];
}

async function loadInstallments(loanId) {
    return apiFetch(`/bank/loans/${loanId}/installments?companyId=${companyId}`);
}

function renderSummary() {
    const totalBalance = state.accounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
    const activeLoanDebt = state.loans
        .filter(loan => String(loan.status).toUpperCase() === 'ACTIVE')
        .reduce((sum, loan) => sum + Number(loan.remainingBalance ?? 0), 0);
    const scoreLabel = getCreditScoreLabel(state.creditScore ?? 0);

    summaryGrid.innerHTML = `
        <article class="summary-tile">
            <span class="summary-label">Total balance</span>
            <span class="summary-value">${formatCurrency(totalBalance)}</span>
            <span class="summary-caption">${state.accounts.length} account${state.accounts.length === 1 ? '' : 's'}</span>
        </article>
        <article class="summary-tile">
            <span class="summary-label">Credit score</span>
            <div class="credit-score-value">
                <span class="summary-value">${state.creditScore ?? '—'}</span>
                <span class="credit-score-badge ${scoreLabel.className}">${scoreLabel.text}</span>
            </div>
            <span class="summary-caption">Range 300–850</span>
        </article>
        <article class="summary-tile">
            <span class="summary-label">Interest rate</span>
            <span class="summary-value">${state.interestRate != null ? `${state.interestRate.toFixed(2)}%` : '—'}</span>
            <span class="summary-caption">Annual rate for new loans</span>
        </article>
        <article class="summary-tile">
            <span class="summary-label">Outstanding loans</span>
            <span class="summary-value">${formatCurrency(activeLoanDebt)}</span>
            <span class="summary-caption">${state.loans.filter(l => String(l.status).toUpperCase() === 'ACTIVE').length} active loan(s)</span>
        </article>
    `;

    updateSidebarBalance(totalBalance);
}

function updateSidebarBalance(totalBalance) {
    const sidebarBalanceText = document.getElementById('sidebar-balance-text');
    if (sidebarBalanceText) {
        sidebarBalanceText.textContent = formatCurrency(totalBalance);
    }
}

function renderAccounts() {
    if (state.accounts.length === 0) {
        accountsBody.innerHTML = '';
        accountsEmpty.classList.remove('hidden');
        accountPlaceholder.classList.remove('hidden');
        accountDetail.classList.add('hidden');
        return;
    }

    accountsEmpty.classList.add('hidden');

    if (!state.selectedAccountIban || !state.accounts.some(a => a.iban === state.selectedAccountIban)) {
        state.selectedAccountIban = state.accounts[0].iban;
    }

    accountsBody.innerHTML = state.accounts.map(account => `
        <tr data-iban="${escapeHtml(account.iban)}" class="${account.iban === state.selectedAccountIban ? 'is-selected' : ''}">
            <td><strong>${escapeHtml(account.name)}</strong></td>
            <td><span class="secondary-text">${formatIban(account.iban)}</span></td>
            <td><span class="account-type-badge">${escapeHtml(account.accountType)}</span></td>
            <td><strong>${formatCurrency(account.balance)}</strong></td>
        </tr>
    `).join('');

    accountsBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', async () => {
            state.selectedAccountIban = row.dataset.iban ?? null;
            renderAccounts();
            await renderAccountDetail();
        });
    });
}

async function renderAccountDetail() {
    const account = state.accounts.find(a => a.iban === state.selectedAccountIban);
    if (!account) {
        accountPlaceholder.classList.remove('hidden');
        accountDetail.classList.add('hidden');
        return;
    }

    accountPlaceholder.classList.add('hidden');
    accountDetail.classList.remove('hidden');

    accountNameEl.textContent = account.name;
    accountMetaEl.textContent = `${formatIban(account.iban)} • ${account.currency ?? 'EUR'}`;
    accountMetadata.innerHTML = `
        <div><dt>Balance</dt><dd>${formatCurrency(account.balance)}</dd></div>
        <div><dt>Account type</dt><dd>${escapeHtml(account.accountType)}</dd></div>
        <div><dt>Opened</dt><dd>${formatDate(account.createdAt)}</dd></div>
        <div><dt>Currency</dt><dd>${escapeHtml(account.currency ?? 'EUR')}</dd></div>
    `;

    ledgerList.innerHTML = '<div class="account-skeleton"></div><div class="account-skeleton"></div>';

    try {
        const entries = await loadLedger(account.iban);

        if (entries.length === 0) {
            ledgerList.innerHTML = '';
            ledgerEmpty.classList.remove('hidden');
            return;
        }

        ledgerEmpty.classList.add('hidden');
        ledgerList.innerHTML = entries
            .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime())
            .map(entry => {
                const isCredit = String(entry.entryType).toUpperCase() === 'CREDIT';
                return `
                    <div class="ledger-entry">
                        <div>
                            <strong>${escapeHtml(entry.description || 'Transaction')}</strong>
                            <span>${formatDateTime(entry.bookedAt)}</span>
                        </div>
                        <span class="ledger-amount ${isCredit ? 'credit' : 'debit'}">
                            ${isCredit ? '+' : ''}${formatCurrency(entry.amount)}
                        </span>
                    </div>
                `;
            }).join('');
    } catch {
        ledgerList.innerHTML = '<p class="modal-hint">Could not load transactions.</p>';
        ledgerEmpty.classList.add('hidden');
    }
}

function renderLoans() {
    if (state.loans.length === 0) {
        loansBody.innerHTML = '';
        loansEmpty.classList.remove('hidden');
        loanPlaceholder.classList.remove('hidden');
        loanDetail.classList.add('hidden');
        return;
    }

    loansEmpty.classList.add('hidden');

    if (!state.selectedLoanId || !state.loans.some(l => l.id === state.selectedLoanId)) {
        state.selectedLoanId = state.loans[0].id;
    }

    loansBody.innerHTML = state.loans.map(loan => `
        <tr data-loan-id="${loan.id}" class="${loan.id === state.selectedLoanId ? 'is-selected' : ''}">
            <td><strong>Loan #${loan.id}</strong></td>
            <td>${formatLoanType(loan.loanType)}</td>
            <td>${formatCurrency(loan.principal)}</td>
            <td>${formatCurrency(loan.remainingBalance)}</td>
            <td>${Number(loan.annualInterestRate ?? 0).toFixed(2)}%</td>
            <td>
                <span class="status-badge ${loanStatusClass(loan.status)}">
                    ${String(loan.status ?? '').replaceAll('_', ' ')}
                </span>
            </td>
        </tr>
    `).join('');

    loansBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', async () => {
            state.selectedLoanId = Number(row.dataset.loanId);
            renderLoans();
            await renderLoanDetail();
        });
    });
}

async function renderLoanDetail() {
    const loan = state.loans.find(l => l.id === state.selectedLoanId);
    if (!loan) {
        loanPlaceholder.classList.remove('hidden');
        loanDetail.classList.add('hidden');
        return;
    }

    loanPlaceholder.classList.add('hidden');
    loanDetail.classList.remove('hidden');

    loanTitle.textContent = `Loan #${loan.id}`;
    loanSubtitle.textContent = `${formatLoanType(loan.loanType)} • ${formatIban(loan.iban)}`;
    loanMetadata.innerHTML = `
        <div><dt>Principal</dt><dd>${formatCurrency(loan.principal)}</dd></div>
        <div><dt>Remaining</dt><dd>${formatCurrency(loan.remainingBalance)}</dd></div>
        <div><dt>Interest rate</dt><dd>${Number(loan.annualInterestRate ?? 0).toFixed(2)}% p.a.</dd></div>
        <div><dt>Status</dt><dd>${String(loan.status ?? '').replaceAll('_', ' ')}</dd></div>
        <div><dt>Start date</dt><dd>${formatDate(loan.startDate)}</dd></div>
        <div><dt>End date</dt><dd>${formatDate(loan.endDate)}</dd></div>
    `;

    installmentList.innerHTML = '<div class="account-skeleton"></div><div class="account-skeleton"></div>';

    try {
        const installments = await loadInstallments(loan.id);

        installmentList.innerHTML = installments.map(installment => {
            const status = normalizePaymentStatus(installment.status);
            const canPay = status !== 'PAID' && String(loan.status).toUpperCase() === 'ACTIVE';

            return `
                <div class="installment-entry">
                    <div>
                        <strong>Due ${formatDate(installment.dueDate)}</strong>
                        <span>
                            Principal ${formatCurrency(installment.principalAmount)} •
                            Interest ${formatCurrency(installment.interestAmount)}
                        </span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="status-badge ${paymentStatusClass(status)}">${status}</span>
                        <strong>${formatCurrency(installment.totalAmount)}</strong>
                        ${canPay ? `<button class="pay-installment-btn" data-installment-id="${installment.id}">Pay</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        installmentList.querySelectorAll('.pay-installment-btn').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                await payInstallment(Number(btn.dataset.installmentId), btn);
            });
        });
    } catch {
        installmentList.innerHTML = '<p class="modal-hint">Could not load installments.</p>';
    }
}

async function payInstallment(installmentId, button) {
    button.disabled = true;
    button.textContent = 'Paying...';

    try {
        await apiFetch(`/bank/loans/installments/${installmentId}/pay`, {
            method: 'POST',
            body: JSON.stringify({ companyId })
        });

        await refreshAll();
        await renderLoanDetail();
    } catch (error) {
        alert(error instanceof Error ? error.message : 'Payment failed.');
        button.disabled = false;
        button.textContent = 'Pay';
    }
}

function openModal(backdrop) {
    backdrop.classList.remove('hidden');
}

function closeModal(backdrop) {
    backdrop.classList.add('hidden');
}

function populateLoanAccountSelect() {
    loanAccountSelect.innerHTML = state.accounts.map(account => `
        <option value="${escapeHtml(account.iban)}">${escapeHtml(account.name)} (${formatIban(account.iban)})</option>
    `).join('');
}

async function refreshAll() {
    await Promise.all([loadAccounts(), loadLoans(), loadCreditInfo()]);
    renderSummary();
    renderAccounts();
    renderLoans();
}

newAccountBtn.addEventListener('click', () => {
    accountNameInput.value = '';
    accountModalError.textContent = '';
    openModal(accountModalBackdrop);
    accountNameInput.focus();
});

emptyCreateAccountBtn?.addEventListener('click', () => {
    accountNameInput.value = '';
    accountModalError.textContent = '';
    openModal(accountModalBackdrop);
    accountNameInput.focus();
});

createAccountBtn.addEventListener('click', async () => {
    const accountName = accountNameInput.value.trim();
    if (!accountName) {
        accountModalError.textContent = 'Please enter an account name.';
        return;
    }

    createAccountBtn.disabled = true;
    accountModalError.textContent = '';

    try {
        await apiFetch('/bank/accounts', {
            method: 'POST',
            body: JSON.stringify({ companyId, accountName })
        });

        closeModal(accountModalBackdrop);
        await refreshAll();
        await renderAccountDetail();
    } catch (error) {
        accountModalError.textContent = error instanceof Error ? error.message : 'Failed to create account.';
    } finally {
        createAccountBtn.disabled = false;
    }
});

applyLoanBtn.addEventListener('click', () => {
    if (state.accounts.length === 0) {
        alert('Open a bank account before applying for a loan.');
        return;
    }

    populateLoanAccountSelect();
    loanAmountInput.value = '';
    loanModalError.textContent = '';
    loanModalRate.textContent = `Your current rate: ${state.interestRate != null ? `${state.interestRate.toFixed(2)}% p.a.` : '—'}`;
    openModal(loanModalBackdrop);
});

submitLoanBtn.addEventListener('click', async () => {
    const iban = loanAccountSelect.value;
    const principal = Number(loanAmountInput.value);
    const loanType = loanTypeSelect.value;
    const termMonths = Number(loanTermSelect.value);

    if (!iban || !principal || principal < 1000) {
        loanModalError.textContent = 'Enter a loan amount of at least €1,000.';
        return;
    }

    submitLoanBtn.disabled = true;
    loanModalError.textContent = '';

    try {
        await apiFetch('/bank/loans', {
            method: 'POST',
            body: JSON.stringify({ companyId, iban, principal, loanType, termMonths })
        });

        closeModal(loanModalBackdrop);
        await refreshAll();
        await renderLoanDetail();
    } catch (error) {
        loanModalError.textContent = error instanceof Error ? error.message : 'Loan application failed.';
    } finally {
        submitLoanBtn.disabled = false;
    }
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
        closeModal(document.getElementById(btn.dataset.closeModal));
    });
});

[accountModalBackdrop, loanModalBackdrop].forEach(backdrop => {
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            closeModal(backdrop);
        }
    });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('is-active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));

        btn.classList.add('is-active');
        document.getElementById(`${btn.dataset.tab}-panel`).classList.remove('hidden');
    });
});

await refreshAll();
await renderAccountDetail();
await renderLoanDetail();
