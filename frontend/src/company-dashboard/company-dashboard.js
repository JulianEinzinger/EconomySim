import { Utils } from "../utils.js";

await Utils.checkAuth();

const params = new URLSearchParams(window.location.hash.replace("#", "?"));
const companyId = params.get('companyId');

async function loadCompanyData() {
    const token = localStorage.getItem('token');

    const response = await fetch(`http://localhost:3000/business/companies/${companyId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    
    const companyData = await response.json();
    
    document.getElementById('company-name').textContent = companyData.name;

    renderDashboard(companyData.businessTypeId);
}

await loadCompanyData();

function renderDashboard(businessType) {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = '';

    switch(businessType) {
        case 3: // Retail
            break;
        case 2: // Manufacturing
            break;
        case 1: // Restaurant
            break;
        default:
            container.textContent = "Unbekannter Business-Type 💀";
    }
}