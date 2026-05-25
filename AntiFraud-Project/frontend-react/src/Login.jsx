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

            const adminData = await adminRes.json();

            if (adminRes.ok) {
                localStorage.setItem('adminId', adminData.admin_id);
                localStorage.setItem('adminRole', adminData.role);
                localStorage.setItem('adminName', adminData.name);
                navigate('/dashboard');
                return;
            } else {
                if (adminRes.status === 403) {
                    alert(`BLOKADA SYSTEMOWA: ${adminData.detail}`);
                    return; 
                }
            }

            const userRes = await fetch('http://localhost:8000/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            const userData = await userRes.json();

            if (userRes.ok) {
                localStorage.setItem('userToken', userData.token);
                localStorage.setItem('userId', userData.user_id);
                localStorage.setItem('userName', userData.user_name);
                navigate('/klient');
                return;
            } else {
                if (userRes.status === 403) {
                    alert(`KONTO ZAMROŻONE: ${userData.detail}`);
                } else {
                    alert("Błędny login lub hasło!");
                }
                return;
            }
        } catch (error) {
            console.error("Błąd połączenia z API:", error);
            alert("Błąd połączenia z API.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (passwordValue.length < 6) {
            alert("Hasło musi składać się z minimum 6 znaków.");
            return;
        }

        try {
            const res = await fetch('http://localhost:8000/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue, name: nameValue })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Rejestracja udana! Możesz się teraz zalogować.");
                setView('login');
            } else {
                alert(`Błąd rejestracji: ${data.detail || "Nie udało się założyć konta."}`);
            }
        } catch (error) {
            console.error("Błąd połączenia:", error);
            alert("Błąd połączenia z serwerem.");
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