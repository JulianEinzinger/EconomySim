import { Utils } from "../utils.js";

await Utils.checkAuth();

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
    console.log("A");  
}

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

        // Add a container with a big plus on it at the end of the company cards for adding new companies.
        // fetch next company price
        let nextPriceResult = -1;

        await fetch("http://localhost:3000/users/companies/next-price", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        }).then(res => res.json()).then(data => {
            nextPriceResult = data.nextPrice;
        });

        const addCard = document.createElement("div");
        addCard.classList.add("company-card", "add-card");
        addCard.innerHTML = `
            <h3>+ Add Company</h3>
            <p>Price: ${nextPriceResult === -1 ? "Loading..." : nextPriceResult}</p>
        `;
        addCard.onclick = () => {
            // redirect to add company page
            window.location.href = "../found-company/found-company.html";
        }
        container.appendChild(addCard);

        animateCompanyCards();
    }
}

await fetchCompanyOverview();


// ===== Theme Toggle mit Karten-Animation =====
const themeToggle = document.getElementById("theme-toggle");

// Lade gespeicherten Theme
if(localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️ Light Mode";
}

// Funktion: Karten staggered animieren
function animateCompanyCards() {
    const cards = document.querySelectorAll("#companies-container .company-card");
    cards.forEach((card, index) => {
        // reset Animation
        card.style.animation = "none";
        card.offsetHeight; // Trigger Reflow
        // set Animation erneut
        card.style.animation = `fadeInUp 0.5s forwards`;
        card.style.animationDelay = `${index * 0.15}s`;
    });
}

// Event Listener Theme Toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")) {
        themeToggle.textContent = "☀️ Light Mode";
        localStorage.setItem("theme", "dark");
    } else {
        themeToggle.textContent = "🌙 Dark Mode";
        localStorage.setItem("theme", "light");
    }

    // Animation erneut abspielen
    animateCompanyCards();
});
