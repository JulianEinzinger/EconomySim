const invBody = document.getElementById('inventory-body');

let products = [];

async function fetchAllAvailableProducts() {
    const res = await fetch('http://localhost:3000/items');

    if(res.ok) {
        products = await res.json();
        renderProducts();
    }
}

function renderProducts() {
    invBody.innerHTML = '';

    products.forEach(p => {
        const row = document.createElement('tr');
        const quantity = Math.floor(Math.random() * 100) + 1; // Random quantity for demonstration

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

await fetchAllAvailableProducts();