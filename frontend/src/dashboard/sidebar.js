const companyId = localStorage.getItem('current-company-id');

const companyTitle = document.querySelector('.sidebar-title div');


const token = localStorage.getItem('token');
try {
    const companyRes = await fetch(`http://localhost:3000/business/companies/${companyId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    if(companyRes.ok) {
        const companyInfo = await companyRes.json();
        companyTitle.innerHTML += companyInfo.name;
    }
} catch (error) {
    console.error(`Error while loading company data: ${error}`);
}

export async function updateUnreadMailCount() {
    try {
        // mail unread count
        const mailCountElement = document.getElementById('mail-unread-count-badge');
        mailCountElement.classList.add('hidden');

        const mailRes = await fetch(`http://localhost:3000/mails/unread-count?companyId=${companyId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });


        if(mailRes.ok) {
            const mailData = await mailRes.json();

            if(mailData.unreadCount > 0) {
                mailCountElement.textContent = mailData.unreadCount;
                mailCountElement.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error(`Error while loading mail unread count: ${error}`);
    }
}

await updateUnreadMailCount();
