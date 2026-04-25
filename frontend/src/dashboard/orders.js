import { Utils } from '../utils.js';

await Utils.checkAuth();

const companyId = Number(localStorage.getItem('current-company-id'));
const token = localStorage.getItem('token');

const summaryGrid = document.getElementById('summary-grid');
const ordersBody = document.getElementById('orders-body');
const emptyState = document.getElementById('empty-state');
const detailPlaceholder = document.getElementById('detail-placeholder');
const detailContent = document.getElementById('detail-content');
const detailTitle = document.getElementById('detail-title');
const detailSubtitle = document.getElementById('detail-subtitle');
const detailMetadata = document.getElementById('detail-metadata');
const detailItems = document.getElementById('detail-items');
const itemsNote = document.getElementById('items-note');
const payBtn = document.getElementById('pay-btn');

payBtn.addEventListener('click', handlePayOrder);

const searchInput = document.getElementById('search-input');
const paymentFilter = document.getElementById('payment-filter');
const deliveryFilter = document.getElementById('delivery-filter');
const sortSelect = document.getElementById('sort-select');

const state = {
    orders: [],
    selectedOrderId: null
};

async function loadOrders() {
    const wholesalerNames = await loadWholesalerNames();

    const response = await fetch(`http://localhost:3000/orders?companyId=${companyId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if(!response.ok) {
        throw new Error(`Orders endpoint returned ${response.status}`);
    }

    const data = await response.json();
    state.orders = data.map(order => normalizeOrder(order, wholesalerNames));

    if(state.orders.lenth > 0) {
        state.selectedOrderId = state.orders[0].id;
    }
}

async function loadWholesalerNames() {
    try {
        const response = await fetch('http://localhost:3000/wholesalers');
        if(!response.ok) {
            throw new Error('Failed to fetch wholesalers');
        }

        const wholesalers = await response.json();
        return new Map(wholesalers.map(wholesaler => [wholesaler.id, wholesaler.name]));
    } catch (error) {
        return new Map();
    }
}

function normalizeOrder(order, wholesalerNames) {
    return {
        id: Number(order.id),
        companyId: Number(order.companyId ?? companyId),
        wholesalerId: Number(order.wholesalerId ?? -1),
        wholesalerName: order.wholesalerName ?? wholesalerNames.get(Number(order.wholesalerId)) ?? `Wholesaler #${order.wholesalerId ?? '?'}`,
        orderDate: parseDate(order.orderDate),
        deliveryDate: parseDate(order.deliveryDate),
        totalPrice: Number(order.totalPrice ?? 0),
        paymentStatus: normalizePaymentStatus(order.paymentStatus),
        deliveryStatus: normalizeDeliveryStatus(order.deliveryStatus),
        paymentDate: parseDate(order.paymentDate),
        items: Array.isArray(order.items) ? order.items.map(i => normalizeItem(i)) : null
    };
}

function normalizeItem(item) {
    return {
        id: Number(item.id ?? -1),
        productId: Number(item.productId ?? -1),
        productName: item.productName ?? `Product #${item.productId ?? '?'}`,
        quantity: Number(item.quantity ?? 0),
        pricePerUnit: Number(item.pricePerUnit ?? 0),
        subtotal: Number(item.subtotal ?? 0)
    };
}

function normalizePaymentStatus(status) {
    const normalized = String(status ?? "").trim().toUpperCase().replaceAll(" ", "_");
    switch(normalized) {
        case "PAYED":
            return "PAID";
            break;
        case "OVERDUE":
            return "OVERDUE";
            break;
        default:
            return "PENDING";
            break;
    }
}

function normalizeDeliveryStatus(status) {
    const normalized = String(status ?? "").trim().toUpperCase().replaceAll(" ", "_");
    switch(normalized) {
        case "DELIVERED":
            return "DELIVERED";
            break;
        case "IN_TRANSIT":
            return "IN_TRANSIT";
            break;
        default:
            return "PENDING";
            break;
    }
}

function parseDate(value) {
    if(!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(value);
}

function formatDate(date) {
    if(!date) {
        return "Not scheduled";
    }

    return new Intl.DateTimeFormat("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function formatDay(date) {
    if(!date) {
        return "Not scheduled"
    }

    return new Intl.DateTimeFormat("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function formatIban(iban) {
    return String(iban)
  .replace(/\s+/g, '')
  .replace(/(.{4})/g, '$1 ')
  .trim();
}

function getTime(date) {
    return date ? date.getTime() : 0;
}

function getFilteredOrders() {
    const search = searchInput.value.trim().toLowerCase();
    const payment = paymentFilter.value;
    const delivery = deliveryFilter.value;
    const sort = sortSelect.value;

    const filtered = state.orders.filter(order => {
        const matchesSearch = 
            search.length == 0 ||
            String(order.id).includes(search) ||
            order.wholesalerName.toLowerCase().includes(search);

        const matchesPayment = payment === 'ALL' || order.paymentStatus === payment;
        const matchesDelivery = delivery === 'ALL' ||order.deliveryStatus === delivery;

        return matchesSearch && matchesPayment && matchesDelivery;
    });

    filtered.sort((left, right) => compareOrders(left, right, sort));
    return filtered;
}

function compareOrders(left, right, sort) {
    switch (sort) {
        case "DATE_ASC":
            return getTime(left.orderDate) - getTime(right.orderDate);
        case "TOTAL_DESC":
            return right.totalPrice - left.totalPrice;
        case "TOTAL_ASC":
            return left.totalPrice - right.totalPrice;
        case "PAYMENT":
            return paymentRank(left.paymentStatus) - paymentRank(right.paymentStatus);
        case "DELIVERY":
            return deliveryRank(left.deliveryStatus) - deliveryRank(right.deliveryStatus);
        case "DATE_DESC":
        default:
            return getTime(right.orderDate) - getTime(left.orderDate);
    }
}

function paymentRank(status) {
    switch (status) {
        case "OVERDUE":
            return 0;
        case "PENDING":
            return 1;
        case "PAID":
            return 2;
        default:
            return 3;
    }
}

function deliveryRank(status) {
    switch (status) {
        case "IN_TRANSIT":
            return 0;
        case "DELIVERED":
            return 1;
        default:
            return 2;
    }
}

function renderSummary(orders) {
    const openOrders = orders.filter(order => order.deliveryStatus === "IN_TRANSIT").length;
    const pendingPayments = orders.filter(order => order.paymentStatus === "PENDING").length;
    const overduePaments = orders.filter(order => order.paymentStatus === "OVERDUE").length;
    const totalValue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    const cards = [
        { label: "Open orders", value: openOrders, caption: "Orders still in transit" },
        { label: "Pending payments", value: pendingPayments, caption: "Orders waiting for payment" },
        { label: "Overdue", value: overduePaments, caption: "Orders that need attention" },
        { label: "Order volume", value: formatCurrency(totalValue), caption: `${orders.length} orders in this view` }
    ];

    summaryGrid.innerHTML = cards.map(card => `
        <div class="summary-tile">
            <span class="summary-label">${card.label}</span>
            <span class="summary-value">${card.value}</span>
            <span class="summary-caption">${card.caption}</span>
        </div>
    `).join("");
}

function renderOrders() {
    const filteredOrders = getFilteredOrders();

    if (filteredOrders.length === 0) {
        ordersBody.innerHTML = "";
        emptyState.classList.remove("hidden");
        detailPlaceholder.classList.remove("hidden");
        detailContent.classList.add("hidden");
        renderSummary([]);
        return;
    }

    emptyState.classList.add("hidden");

    if (!filteredOrders.some(order => order.id === state.selectedOrderId)) {
        state.selectedOrderId = filteredOrders[0].id; // auto select first order if current selection is not visible
    }

    ordersBody.innerHTML = filteredOrders.map(order => `
        <tr data-order-id="${order.id}" class="${order.id === state.selectedOrderId ? "is-selected" : ""}">
            <td>
                <div class="order-identifier">
                    <strong>#${order.id}</strong>
                    <span class="secondary-text">${order.items?.length ?? 0} items</span>
                </div>
            </td>
            <td>${escapeHtml(order.wholesalerName)}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>${formatDate(order.deliveryDate)}</td>
            <td>${formatCurrency(order.totalPrice)}</td>
            <td><span class="status-badge ${statusClass(order.paymentStatus)}">${statusTitle(order.paymentStatus)}</span></td>
            <td><span class="status-badge ${statusClass(order.deliveryStatus)}">${statusTitle(order.deliveryStatus)}</span></td>
        </tr>    
    `).join("");

    Array.from(ordersBody.querySelectorAll("tr")).forEach(row => {
        row.addEventListener("click", async () => {
            state.selectedOrderId = Number(row.dataset.orderId);
            renderOrders();
            await renderDetails();
        });
    });

    renderSummary(filteredOrders);
}

async function renderDetails() {
    const order = state.orders.find(order => order.id === state.selectedOrderId);
    if(!order) {
        detailPlaceholder.classList.remove("hidden");
        detailContent.classList.add("hidden");
        return;
    }

    if (!order.items) {
        order.items = await loadOrderItems(order.id);
    }

    detailPlaceholder.classList.add("hidden");
    detailContent.classList.remove("hidden");

    detailTitle.textContent = `Order #${order.id}`;
    detailSubtitle.textContent = `${order.wholesalerName} • ${statusTitle(order.deliveryStatus)} / ${statusTitle(order.paymentStatus)}`;

    detailMetadata.innerHTML = [
        detailField('Wholesaler', order.wholesalerName),
        detailField('Total', formatCurrency(order.totalPrice)),
        detailField('Ordered on', formatDate(order.orderDate)),
        detailField('Delivery date', formatDate(order.deliveryDate)),
        detailField('Payment status', `${badgeHtml(order.paymentStatus)}${order.paymentStatus==='PAID' ? ` - ${formatDay(order.paymentDate)}` : ''}`),
        detailField('Delivery status', badgeHtml(order.deliveryStatus))
    ].join("");

    const items = Array.isArray(order.items) ? order.items : [];
    itemsNote.textContent = items.length > 0 ? `${items.length} line items` : 'Items endpoint pending';

    if (items.length === 0) {
        detailItems.innerHTML = `<div class="detail-item"><strong>No items loaded</strong><span>The order line items will appear here once the matching endpoint is ready.</span></div>`;
        return;
    }

    detailItems.innerHTML = items.map(item => `
        <div class="detail-item">
            <div>
                <strong>${escapeHtml(item.productName)}</strong>
                <span>${item.quantity} units • ${formatCurrency(item.pricePerUnit)} each</span>
            </div>
            <strong>${formatCurrency(item.subtotal)}</strong>
        </div>    
    `).join("");

    // Pay Button
    payBtn.classList.toggle('hidden', !['PENDING', 'OVERDUE'].includes(order.paymentStatus));
    payBtn.classList.remove('pending', 'overdue');
    if (order.paymentStatus === 'PENDING') payBtn.classList.add('pending');
    if (order.paymentStatus === 'OVERDUE') payBtn.classList.add('overdue');
}

async function loadOrderItems(orderId) {
    try {
        const response = await fetch(`http://localhost:3000/orders/${orderId}/items`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Order items endpoint returned ${response.status}`);
        }
        const data = await response.json();
        return data.map(normalizeItem)
    } catch (error) {
        return [];
    }
}

function badgeHtml(status) {
    return `<span class="status-badge ${statusClass(status)}">${statusTitle(status)}</span>`;
}

function detailField(term, value) {
    return `<div><dt>${term}</dt><dd>${value}</dd></div>`;
}

function statusTitle(status) {
    switch (status) {
        case "PAID":
            return "Paid";
        case "OVERDUE":
            return "Overdue";
        case "IN_TRANSIT":
            return "In transit";
        case "DELIVERED":
            return "Delivered";
        default:
            return "Pending";
    }
}

function statusClass(status) {
    return statusTitle(status).toLowerCase().replace(" ", "-");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function registerFilters() {
    [searchInput, paymentFilter, deliveryFilter, sortSelect].forEach(element => {
        element.addEventListener("input", () => {
            renderOrders();
            renderDetails();
        });
        element.addEventListener("change", () => {
            renderOrders();
            renderDetails();
        });
    })
}



// ─── Payment Modal ────────────────────────────
const payModalBackdrop  = document.getElementById('pay-modal-backdrop');
const modalTitle        = document.getElementById('modal-title');
const modalSubtitle     = document.getElementById('modal-subtitle');
const modalTotal        = document.getElementById('modal-total');
const accountList       = document.getElementById('account-list');
const modalConfirmBtn   = document.getElementById('modal-confirm-btn');
const modalCancelBtn    = document.getElementById('modal-cancel-btn');
const modalCloseBtn     = document.getElementById('modal-close-btn');

let selectedAccountId = null;

// Öffne Modal mit aktueller Order
async function handlePayOrder() {
    const order = state.orders.find(o => o.id === state.selectedOrderId);
    if(!order) return;

    selectedAccountId = null;
    modalConfirmBtn.disabled = true;

    modalTitle.textContent = `Pay Order #${order.id}`;
    modalSubtitle.textContent = `${order.wholesalerName} • ${order.paymentStatus === 'OVERDUE' ? '⚠ Overdue' : 'Payment pending'}`;
    modalTotal.textContent = formatCurrency(order.totalPrice);

    // Show skeleton
    accountList.innerHTML = `
        <div class="account-skeleton"></div>
        <div class="account-skeleton"></div>
    `;

    payModalBackdrop.classList.remove('hidden');

    // Load bank accounts
    const accounts = await loadBankAccounts(); // TODO implement loading bank accounts
    renderAccountList(accounts, order.totalPrice);
}

async function loadBankAccounts() {
    try {
        throw new Error('Account loading Not Yet Implemented!');
    } catch {
        // Fallback-Data for development
        /*
        return [
            { id: 1, name: "Main Business Account", iban: 'AT12 3456 7890 1234 5678', balance: 14350 },
            { id: 2, name: "Operations Account", iban: 'AT98 7654 3210 9876 5432', balance: 26 }
        ];
        */
       return [];
    }
}

function renderAccountList(accounts, orderTotal) {
    if (accounts.length === 0) {
        accountList.innerHTML = `<p style="color:#7b8091;font-size:14px;margin:0">No bank accounts found.</p>`
        return;
    }

    accountList.innerHTML = accounts.map(acc => {
        const insufficient = acc.balance < orderTotal;
        return `
            <button class="account-option" data-account-id="${acc.id}" ${insufficient ? 'title="Insufficient balance"' : ''}>
                <div class="account-icon">
                    <span class="material-icons-outlined">account_balance</span>
                </div>
                <div class="account-info">
                    <span class="account-name">${escapeHtml(acc.name)}</span>
                    <span class="account-iban">${formatIban(acc.iban)}</span>
                </div>
                <span class="account-balance ${insufficient ? 'insufficient' : ''}">
                    ${formatCurrency(acc.balance)}
                </span>
            </button>
        `;
    }).join('');

    accountList.querySelectorAll('.account-option').forEach(btn => {
        btn.addEventListener("click", () => {
            accountList.querySelectorAll('.account-option').forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            selectedAccountId = Number(btn.dataset.accountId);
            modalConfirmBtn.disabled = false;
        });
    });
}

function closeModal() {
    payModalBackdrop.classList.add('hidden');
    selectedAccountId = null;
}

// confirm payment
modalConfirmBtn.addEventListener("click", async () => {
    const order = state.orders.find(o => o.id === state.selectedOrderId);
    if(!order || !selectedAccountId) return;

    modalConfirmBtn.disabled = true;
    modalConfirmBtn.innerHTML = `<span class="material-icons-outlined">hourglass_top</span> Processing...`;

    try {
        const response = await fetch(`http://localhost:3000/...`, { // TODO implement paying order
            method: 'TODO',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bankAccountId: selectedAccountId })
        });

        if(!response.ok) throw new Error(`Something happened while trying to pay order #${order.id}`);

        // Status lokal aktualisieren
        order.paymentStatus = 'PAID';
        order.paymentDate = new Date();

        closeModal();
        renderOrders();
    } catch {
        modalConfirmBtn.disabled = false;
        modalConfirmBtn.innerHTML = `<span class="material-icons-outlined>check_circle</span> Confirm payment`;
        alert('Payment failed. Please try again.');
    }
});

modalCancelBtn.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);

// Backdrop-Click closing modal
payModalBackdrop.addEventListener('click', (e) => {
    if (e.target === payModalBackdrop) closeModal();
})

registerFilters();
await loadOrders();
renderOrders();
await renderDetails();