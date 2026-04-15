document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const loginValue = document.getElementById('login').value;
    const passwordValue = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login: loginValue,
                password: passwordValue
            })
        });

        const data = await response.json();


        if (response.ok) {

            window.location.href = "dashboard.html";
        } else {
           
            alert("BŁĄD: " + data.detail);
        }
    } catch (error) {
        console.error("Błąd połączenia z API:", error);
        alert("Błąd połączenia z API.");
    }
});