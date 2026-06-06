const companyId = localStorage.getItem('current-company-id');

const companyTitle = document.querySelector('.sidebar-title div');


const token = localStorage.getItem('token');
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