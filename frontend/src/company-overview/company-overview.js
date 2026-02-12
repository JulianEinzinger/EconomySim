document.addEventListener("DOMContentLoaded", async () => {
    // load token
    const token = localStorage.getItem('token');

    // fetch company overview data
    const result = await fetch("http://localhost:3000/users/companies");

    if (result.ok) {
        const data = await result.json();
        document.getElementById("tmp").textContent = JSON.stringify(data);
    }
});