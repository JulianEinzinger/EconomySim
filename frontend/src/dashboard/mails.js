const mailsBody         = document.getElementById('mails-body');
const emptyState        = document.getElementById('empty-state');

const detailPlaceholder = document.getElementById('detail-placeholder');
const detailContent     = document.getElementById('detail-content');
const mailSubject       = document.getElementById('mail-subject');
const mailMeta          = document.getElementById('mail-meta');
const mailBody          = document.getElementById('mail-body');

const searchInput       = document.getElementById('search-input');
const statusFilter      = document.getElementById('status-filter');
const sortSelect        = document.getElementById('sort-select');

const state = {
    mails: [],
    selectedMailId: null
};

const token = localStorage.getItem('token');
const companyId = Number(localStorage.getItem('current-company-id'));

// Dummy data (TODO replace with API fetching)
state.mails = [
    { id: 1, sender: 'METRO AG', subject: 'Order confirmation #12345', content: ``, date: new Date(), status: 'UNREAD' },
    { id: 2, sender: 'Bank Austria', subject: 'Zahlungserinnerung', content: ``, date: new Date(), status: 'READ' },
];

async function loadMails() {
    const response = await fetch(`http://localhost:3000/mails?companyId=${companyId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Mails endpoint returned: ${response.status}`);
    }

    const data = await response.json();

    state.mails = data.map(mail => ({
        id: mail.id,
        sender: mail.sender,
        subject: mail.subject,
        content: mail.content,
        date: parseDate(mail.createdAt),
        status: mail.isRead ? 'READ' : 'UNREAD'
    }));
}

function formatDate(date) {
    return new Intl.DateTimeFormat("de-AT", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function parseDate(value) {
    if(!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getFilteredMails() {
    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    let filtered = state.mails.filter(m => {
        const matchesSearch =   m.subject.toLowerCase().includes(search) ||
                                m.sender.toLowerCase().includes(search);
        const matchesStatus = m.status === status || status === 'ALL';

        return matchesSearch && matchesStatus;
    });

    if(sortSelect.value === "DATE_ASC") {
        filtered.sort((a, b) => a.date - b.date);
    } else {
        filtered.sort((a, b) => b.date - a.date);
    }

    return filtered;
}

function renderMails() {
    const mails = getFilteredMails();

    if(mails.length === 0) {
        mailsBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    mailsBody.innerHTML = mails.map(mail => `
        <tr data-id="${mail.id}" class="${mail.id === state.selectedMailId ? 'is-selected' : ''}">
            <td>${mail.sender}</td>
            <td>${mail.subject}</td>
            <td>${formatDate(mail.date)}</td>
            <td>
                <span class="status-badge ${mail.status === 'READ' ? 'paid' : 'pending'}">
                    ${mail.status}
                </span>
            </td>
        </tr>
        `).join("");

    mailsBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', async () => {
            state.selectedMailId = Number(row.dataset.id);
            await renderDetails();
            renderMails();
        });
    });
}

async function renderDetails() {
    const mail = state.mails.find(mail => mail.id === state.selectedMailId);
    if (!mail) return;

    detailPlaceholder.classList.add('hidden');
    detailContent.classList.remove('hidden');

    mailSubject.textContent = mail.subject;
    mailMeta.textContent = `${mail.sender} • ${formatDate(mail.date)}`;
    mailBody.innerHTML = mail.content;

    mail.status = 'READ'; // TODO fetch API for reading mail
    const result = await fetch(`http://localhost:3000/mails/${state.selectedMailId}/read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
        
    });

    if(!result.ok) {
        throw new Error(`Posting to read mail resulted in: ${result.status}`);
    }
}

[searchInput, statusFilter, sortSelect].forEach(element => {
    element.addEventListener('input', async () => {
        renderMails();
        await renderDetails();
    });
});

await loadMails();
renderMails();