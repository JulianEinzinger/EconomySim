document.addEventListener("DOMContentLoaded", async () => {
    // load token
    const token = localStorage.getItem('token');

    // fetch company overview data
    const result = await fetch("http://localhost:3000/users/me", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if(result.ok) {
        const userData = await result.json();
        document.getElementById("tmp").textContent = `Welcome, ${userData.username}!`;
    }
});

// TODO: fetch and display company overview data in the #companies-container element.
// company fetch url is http://localhost:3000/users/companies, method is GET, and it also requires the same Authorization header as the user info fetch.
async function fetchCompanyOverview() {
    const token = localStorage.getItem('token');

    const result = await fetch("http://localhost:3000/users/companies", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    if(result.ok) {
        
        const data = await result.json();
        console.log(data);

        // TODO: dynamically create and insert company cards into the #companies-container element based on the fetched data.
        const container = document.getElementById("companies-container");
        data.forEach(company => {
            const card = document.createElement("div");
            card.classList.add("company-card");
            card.innerHTML = `
                <h3>${company.name} (${company.id})</h3>
                <p>Industry: NotYetImplemented</p>
            `;
            container.appendChild(card);
        });
    }
}

await fetchCompanyOverview();