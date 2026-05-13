import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [dashboardData, setDashboardData] = useState({ saldo: 0, history: [] });
    const [transferData, setTransferData] = useState({ receiver_id: '', amount: '' });
    const [message, setMessage] = useState('');

    const fetchDashboard = async (userId) => {
        try {
            const res = await fetch(`http://localhost:8000/api/user/${userId}/dashboard`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(data);
            }
        } catch (error) {
            console.error("Błąd pobierania danych:", error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        const id = localStorage.getItem('userId');
        const name = localStorage.getItem('userName');

        if (!token) {
            navigate('/');
        } else {
            setUser({ id, name, token });
            fetchDashboard(id);

            const interval = setInterval(() => fetchDashboard(id), 3000);
            return () => clearInterval(interval);
        }
    }, [navigate]);

    const handleTransferChange = (e) => setTransferData({ ...transferData, [e.target.name]: e.target.value });

    const handleTransfer = async (e) => {
        e.preventDefault();
        setMessage('Przetwarzanie przelewu...');
        const res = await fetch('http://localhost:8000/api/user/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: parseInt(user.id),
                receiver_id: parseInt(transferData.receiver_id),
                amount: parseFloat(transferData.amount)
            })
        });
        if (res.ok) {
            setMessage('Przelew zlecony! Czeka na analizę.');
            setTransferData({ receiver_id: '', amount: '' });
            fetchDashboard(user.id);
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Wystąpił błąd podczas zlecania przelewu.');
        }
    };
    const handleUnblock = async (txId, receiverId) => {
        const smsCode = window.prompt(
            "Wpisz kod"
        );

        if (smsCode !== "1234") {
            setMessage('Błędny kod SMS! Ze względów bezpieczeństwa przelew pozostaje wstrzymany.');
            return; 
        }
        try {
            const res = await fetch('http://localhost:8000/api/user/unblock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_id: txId,
                    receiver_id: receiverId,
                    sender_id: parseInt(user.id)
                })
            });
            if (res.ok) {
                setMessage('Potwierdzono tożsamość. Przelew odblokowany i dodany do Zaufanych!');
                fetchDashboard(user.id); 
                setTimeout(() => setMessage(''), 4000);
            }
        } catch (error) {
            console.error("Błąd odblokowania", error);
        }
    };
    const wyloguj = () => {
        localStorage.clear();
        navigate('/');
    };

    if (!user) return null;

    return (
        <div style={{ backgroundColor: '#F4F7FE', minHeight: '100vh', padding: '40px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ color: '#1E3A8A', fontSize: '28px' }}>Witaj, {user.name}</h2>
                        <p style={{ color: '#A3AED0', marginTop: '5px' }}>Twoje ID Klienta: <strong style={{ color: '#2B3674' }}>{user.id}</strong></p>
                    </div>
                    <button onClick={wyloguj} style={{ padding: '10px 20px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        <i className="fa-solid fa-power-off" style={{ marginRight: '8px' }}></i>Wyloguj
                    </button>
                </div>

                {message && (
                    <div style={{ padding: '15px', backgroundColor: '#FEF3C7', color: '#92400E', marginBottom: '20px', borderRadius: '8px', fontWeight: '500' }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ backgroundColor: '#1E3A8A', padding: '30px', borderRadius: '15px', color: 'white', boxShadow: '0 10px 25px rgba(30, 58, 138, 0.2)' }}>
                            <div style={{ fontSize: '14px', color: '#A3B1CC', marginBottom: '10px' }}>Dostępne środki</div>
                            <div style={{ fontSize: '36px', fontWeight: '700' }}>
                                {dashboardData.saldo.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span style={{ fontSize: '20px' }}>PLN</span>
                            </div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ color: '#1E3A8A', marginBottom: '20px' }}>Zleć nowy przelew</h3>
                            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#A3AED0', marginBottom: '5px', fontWeight: '600' }}>Odbiorca (ID Konta)</label>
                                    <input name="receiver_id" type="number" placeholder="np. 15" value={transferData.receiver_id} onChange={handleTransferChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#A3AED0', marginBottom: '5px', fontWeight: '600' }}>Kwota przelewu (PLN)</label>
                                    <input name="amount" type="number" step="0.01" placeholder="0.00" value={transferData.amount} onChange={handleTransferChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                                </div>
                                <button type="submit" style={{ padding: '14px', backgroundColor: '#4318FF', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', marginTop: '10px' }}>
                                    Wykonaj przelew
                                </button>
                            </form>
                        </div>
                    </div>
                    <div style={{ flex: '2', backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', minHeight: '400px' }}>
                        <h3 style={{ color: '#1E3A8A', marginBottom: '20px' }}>Historia operacji</h3>

                        {dashboardData.history.length === 0 ? (
                            <p style={{ color: '#A3AED0', textAlign: 'center', marginTop: '50px' }}>Brak transakcji na koncie.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Data</th>
                                        <th style={{ textAlign: 'left', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Typ / Konto</th>
                                        <th style={{ textAlign: 'left', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Status AML</th>
                                        <th style={{ textAlign: 'right', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Kwota</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.history.map((tx) => (
                                        <tr key={tx.id}>
                                            <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0', fontSize: '13px', color: '#475569' }}>{tx.data}</td>
                                            <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0' }}>
                                                <div style={{ fontWeight: '600', color: '#2B3674', fontSize: '14px' }}>Przelew {tx.typ}</div>
                                                <div style={{ fontSize: '12px', color: '#A3AED0' }}>Konto powiązane: #{tx.kontrahent}</div>
                                            </td>
                                            <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0' }}>
                                                {tx.status_analizy === 'Oczekujaca' && <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontSize: '12px', fontWeight: '600' }}>Weryfikacja</span>}
                                                {tx.status_analizy === 'Zablokowana' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#FEE2E2', color: '#EF4444', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>Wstrzymano</span>
                                                        <button onClick={() => handleUnblock(tx.id, tx.kontrahent)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#10B981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>To ja, odblokuj</button>
                                                    </div>
                                                )}
                                                {(tx.status_analizy !== 'Oczekujaca' && tx.status_analizy !== 'Zablokowana') && <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#16A34A', fontSize: '12px', fontWeight: '600' }}>Czysty</span>}
                                            </td>
                                            <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0', textAlign: 'right', fontWeight: '700', color: tx.typ === 'Wychodzący' ? '#EF4444' : '#16A34A' }}>
                                                {tx.typ === 'Wychodzący' ? '-' : '+'}{tx.kwota.toFixed(2)} PLN
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}