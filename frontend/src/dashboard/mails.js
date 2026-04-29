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

// Dummy data (TODO replace with API fetching)
state.mails = [
    { id: 1, sender: 'METRO AG', subject: 'Order confirmation #12345', content: ``, date: new Date(), status: 'UNREAD' },
    { id: 2, sender: 'Bank Austria', subject: 'Zahlungserinnerung', content: `<!-- Header --> <tr> <td style="background:#0d2c54; color:#ffffff; padding:20px; text-align:center;"> <h1 style="margin:0;">Bank Austria AG</h1> </td> </tr> <!-- Content --> <tr> <td style="padding:25px; color:#333;"> <h2 style="color:#c0392b;">Erinnerung: Kreditrate überfällig</h2> <p>Sehr geehrte Spar AG,</p> <p> wir möchten Sie darüber informieren, dass die fällige Rate Ihres Kredits bislang nicht bei uns eingegangen ist. </p> <!-- Kreditdetails --> <table width="100%" style="border-collapse: collapse; margin:20px 0;"> <tr style="background:#f0f0f0;"> <th align="left" style="padding:10px;">Kreditnummer</th> <th align="left" style="padding:10px;">Fällig am</th> <th align="left" style="padding:10px;">Rate</th> </tr> <tr> <td style="padding:10px;">KR-2024-88921</td> <td style="padding:10px;">01.04.2026</td> <td style="padding:10px;">€ 450,00</td> </tr> </table> <p> Bitte überweisen Sie den ausstehenden Betrag umgehend auf folgendes Konto: </p> <!-- Zahlungsdetails --> <table width="100%" style="margin:15px 0;"> <tr> <td><strong>Empfänger:</strong></td> <td>Bank Austria AG</td> </tr> <tr> <td><strong>IBAN:</strong></td> <td>AT61 1904 3002 3457 3201</td> </tr> <tr> <td><strong>BIC:</strong></td> <td>BKAUATWW</td> </tr> <tr> <td><strong>Verwendungszweck:</strong></td> <td>KR-2024-88921</td> </tr> </table> <!-- Warning --> <div style="background:#fdecea; color:#a94442; padding:15px; border-radius:5px; margin:20px 0;"> ⚠️ Bitte beachten Sie: Bei weiterem Zahlungsverzug können Mahngebühren oder zusätzliche Zinsen anfallen. </div> <!-- CTA --> <p style="text-align:center; margin:30px 0;"> <a href="https://bank.example.com/login" style="background:#c0392b; color:#ffffff; padding:12px 20px; text-decoration:none; border-radius:5px; font-weight:bold;"> Jetzt im Online-Banking prüfen </a> </p> <p> Falls Sie die Zahlung bereits vorgenommen haben, betrachten Sie diese Nachricht bitte als gegenstandslos. </p> <p> Bei Fragen kontaktieren Sie bitte unseren Kundenservice. </p> <p> Mit freundlichen Grüßen<br> Ihre Bank Austria AG </p> </td> </tr> <!-- Footer --> <tr> <td style="background:#f0f0f0; padding:15px; text-align:center; font-size:12px; color:#777;"> © 2026 Bank Austria AG • Wien<br> Diese Nachricht wurde automatisch generiert. </td> </tr>`, date: new Date(), status: 'READ' },
];

function formatDate(date) {
    return Intl.DateTimeFormat("de-AT", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
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
        row.addEventListener('click', () => {
            state.selectedMailId = Number(row.dataset.id);
            renderDetails();
            renderMails();
        });
    });
}

function renderDetails() {
    const mail = state.mails.find(mail => mail.id === state.selectedMailId);
    if (!mail) return;

    detailPlaceholder.classList.add('hidden');
    detailContent.classList.remove('hidden');

    mailSubject.textContent = mail.subject;
    mailMeta.textContent = `${mail.sender} • ${formatDate(mail.date)}`;
    mailBody.innerHTML = mail.content;

    mail.status = 'READ'; // TODO fetch API for reading mail
}

[searchInput, statusFilter, sortSelect].forEach(element => {
    element.addEventListener('input', () => {
        renderMails();
        renderDetails();
    });
});

renderMails();