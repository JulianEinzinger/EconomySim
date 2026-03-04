export class Utils {
    static async checkAuth() {
        const token = localStorage.getItem('token');

        const result = await fetch("http://localhost:3000/users/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if(!result.ok) {
            // send user back to login if not authenticated
            window.location.href = '/index.html'
        } else {
            const userData = await result.json();
            console.log(`${userData.username} logged in.`)
        }
    }
}