import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [view, setView] = useState('login');
    const [loginValue, setLoginValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const [nameValue, setNameValue] = useState(''); 
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
 
            const adminRes = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            if (adminRes.ok) {
                navigate('/dashboard');
                return;
            }


            const userRes = await fetch('http://localhost:8000/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            if (userRes.ok) {
                const data = await userRes.json();

                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userId', data.user_id);
                localStorage.setItem('userName', data.user_name);
                navigate('/klient'); 
                return;
            }


            alert("Błędny login lub hasło!");

        } catch (error) {
            console.error("Błąd połączenia z API:", error);
            alert("Błąd połączenia z API.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue, name: nameValue })
            });
            if (res.ok) {
                alert('Konto utworzone! Możesz się teraz zalogować.');
                setView('login');
            } else {
                alert('Błąd: Login może być już zajęty.');
            }
        } catch (error) {
            alert("Błąd połączenia z API.");
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="logo-circle">
                    <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h2>AntiFraud System</h2>

                {view === 'login' ? (
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label htmlFor="login">Login</label>
                            <input type="text" id="login" required value={loginValue} onChange={(e) => setLoginValue(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Hasło</label>
                            <input type="password" id="password" required value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} />
                        </div>
                        <button type="submit" className="login-btn">Zaloguj się</button>
                        <p style={{ marginTop: '20px', fontSize: '13px', color: '#4a5568' }}>
                            Jesteś klientem banku? <br />
                            <span onClick={() => setView('register')} style={{ color: '#25448c', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Zarejestruj nowe konto</span>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div className="input-group">
                            <label htmlFor="name">Imię i Nazwisko</label>
                            <input type="text" id="name" required value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="login">Wybierz Login</label>
                            <input type="text" id="login" required value={loginValue} onChange={(e) => setLoginValue(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Hasło</label>
                            <input type="password" id="password" required value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} />
                        </div>
                        <button type="submit" className="login-btn" style={{ backgroundColor: '#10B981' }}>Utwórz konto</button>
                        <p style={{ marginTop: '20px', fontSize: '13px', color: '#4a5568' }}>
                            Masz już konto? <br />
                            <span onClick={() => setView('login')} style={{ color: '#25448c', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Wróć do logowania</span>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}