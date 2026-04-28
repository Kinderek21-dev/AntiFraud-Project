import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [loginValue, setLoginValue] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            const data = await response.json();

            if (response.ok) {
                navigate('/dashboard'); 
            } else {
                alert("BŁĄD: " + data.detail);
            }
        } catch (error) {
            console.error("Błąd połączenia z API:", error);
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
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="login">Login</label>
                        <input 
                            type="text" 
                            id="login" 
                            required 
                            value={loginValue} 
                            onChange={(e) => setLoginValue(e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            required 
                            value={passwordValue} 
                            onChange={(e) => setPasswordValue(e.target.value)} 
                        />
                    </div>
                    <button type="submit" className="login-btn">Log in</button>
                </form>
            </div>
        </div>
    );
}