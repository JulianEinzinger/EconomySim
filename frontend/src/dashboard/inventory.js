import { Utils } from "../utils.js";

await Utils.checkAuth();

const companyId = localStorage.getItem('current-company-id');


const invBody = document.getElementById('inventory-body');

let products = [];

async function fetchItems() {
    const token = localStorage.getItem('token');

    const warehousesRes = await fetch(`http://localhost:3000/business/companies/${companyId}/warehouses`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    let warehouses = [];

    if(warehousesRes.ok) {
        warehouses = await warehousesRes.json();

        if(warehouses.length == 0) return;

        products = warehouses[0].items;
        renderProducts();
    }
}

function renderProducts() {
    invBody.innerHTML = '';

    products.forEach(p => {
        const row = document.createElement('tr');
        const quantity = p.quantity;

        const status = quantity > 10 ? 'OK' : quantity > 0 ? 'Low' : 'Empty';

        row.innerHTML = `
            <td class="item-cell">
                <img src="http://localhost:3000/imgs/${p.imgUrl}" alt="${p.name}">
                <span>${p.name}</span>
            </td>
            <td>${p.product_category}</td>
            <td>${quantity}</td>
            <td>${p.unit}</td>
            <td><span class="status ${status.toLowerCase()}">${status}</span></td>
        `;
        invBody.appendChild(row);
    });
}

await fetchItems();