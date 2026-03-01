const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const errorText = document.getElementById('login-error-text');

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if(response.ok) {
            const data = await response.json();

            // Redirect to company overview page with token
            localStorage.setItem('token', data.token); // Store token in localStorage
            
            window.location.href = `company-overview/company-overview.html`;
        } else {
            // login failed
            const errorMsg = (await response.json()).message;
            errorText.textContent = errorMsg;
        }
        
    } catch(e) {
        console.error('Error:', e);
        errorText.textContent =
            'Server nicht erreichbar.';
    }
});