import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [dashboardData, setDashboardData] = useState({ saldo: 0, history: [] });

    const terazLokalnie = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const [transferData, setTransferData] = useState({
        receiver_id: '',
        receiver_name: '',
        amount: '',
        typ_przelewu: 'natychmiastowy',
        data_wykonania: terazLokalnie
    });

    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

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

        if (transferData.receiver_id && parseInt(transferData.receiver_id) === parseInt(user.id)) {
            setStatusMessage({ text: 'Błąd: Nie możesz wysłać przelewu na własne konto.', type: 'error' });
            return;
        }

        setStatusMessage({ text: 'Przetwarzanie zlecenia...', type: 'info' });

        try {
            const response = await fetch('http://localhost:8000/api/user/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: parseInt(user.id),
                    amount: parseFloat(transferData.amount),
                    receiver_id: transferData.receiver_id ? parseInt(transferData.receiver_id) : null,
                    receiver_name: transferData.receiver_name || null,
                    typ_przelewu: transferData.typ_przelewu,
                    data_wykonania: transferData.data_wykonania
                })
            });

            const wynikOkienka = await response.json();

            if (response.ok) {
                setStatusMessage({ text: ` ${wynikOkienka.detail || 'Zlecenie zostało przyjęte pomyślnie!'}`, type: "success" });
                setTransferData({
                    receiver_id: '',
                    receiver_name: '',
                    amount: '',
                    typ_przelewu: 'natychmiastowy',
                    data_wykonania: terazLokalnie
                });
                fetchDashboard(user.id);
                setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
            } else {
                setStatusMessage({
                    text: wynikOkienka.detail || "Wystąpił błąd podczas realizacji zlecenia.",
                    type: "error"
                });
            }
        } catch (error) {
            setStatusMessage({ text: "Błąd połączenia z serwerem.", type: "error" });
        }
    };

    const handleUnblock = async (txId, receiverId) => {
        if (!window.confirm("Zgłosić ten przelew do ręcznej weryfikacji przez analityka banku?")) return;

        try {
            const res = await fetch(`http://localhost:8000/api/user/transactions/${txId}/request-review`, {
                method: 'POST'
            });

            if (res.ok) {
                setStatusMessage({ text: 'Wysłano zgłoszenie. Przelew oczekuje na decyzję analityka AML.', type: 'info' });
                fetchDashboard(user.id);
                setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
            } else {
                setStatusMessage({ text: 'Wystąpił błąd podczas zgłaszania.', type: 'error' });
            }
        } catch (error) {
            console.error("Błąd zgłoszenia", error);
        }
    };

    const wyloguj = () => {
        localStorage.clear();
        navigate('/');
    };

    if (!user) return null;

    return (
        <div style={{ backgroundColor: '#F4F7FE', minHeight: '100vh', padding: '40px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ color: '#1E3A8A', fontSize: '28px' }}>Witaj, {user.name}</h2>
                        <p style={{ color: '#A3AED0', marginTop: '5px' }}>Twoje ID Klienta: <strong style={{ color: '#2B3674' }}>{user.id}</strong></p>
                    </div>
                    <button onClick={wyloguj} style={{ padding: '10px 20px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        <i className="fa-solid fa-power-off" style={{ marginRight: '8px' }}></i>Wyloguj
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>

                    <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ backgroundColor: '#1E3A8A', padding: '30px', borderRadius: '16px', color: 'white', boxShadow: '0 10px 25px rgba(30, 58, 138, 0.2)' }}>
                            <div style={{ fontSize: '14px', color: '#A3B1CC', marginBottom: '10px' }}>Dostępne środki</div>
                            <div style={{ fontSize: '36px', fontWeight: '700' }}>
                                {dashboardData.saldo.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span style={{ fontSize: '20px' }}>PLN</span>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(43, 54, 116, 0.05)' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1B2559', marginBottom: '20px' }}>Nowy Przelew</h3>

                            {statusMessage.text && (
                                <div style={{
                                    padding: '15px',
                                    borderRadius: '10px',
                                    marginBottom: '20px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: statusMessage.type === 'success' ? '#DEFCE7' : (statusMessage.type === 'info' ? '#E0E7FF' : '#FEE2E2'),
                                    color: statusMessage.type === 'success' ? '#16A34A' : (statusMessage.type === 'info' ? '#4338CA' : '#DC2626'),
                                    border: `1px solid ${statusMessage.type === 'success' ? '#BBF7D0' : (statusMessage.type === 'info' ? '#C7D2FE' : '#FCA5A5')}`
                                }}>
                                    {statusMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#2B3674', marginBottom: '6px', display: 'block' }}>Numer ID Odbiorcy</label>
                                    <input
                                        type="number"
                                        value={transferData.receiver_id}
                                        onChange={(e) => setTransferData({ ...transferData, receiver_id: e.target.value, receiver_name: '' })}
                                        placeholder="Wpisz ID konta (np. 5)"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E0E5F2', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', color: '#A3AED0', fontSize: '12px', fontWeight: '600', margin: '2px 0' }}>
                                    <div style={{ flex: 1, height: '1px', background: '#E0E5F2' }}></div>
                                    <span style={{ padding: '0 10px' }}>LUB</span>
                                    <div style={{ flex: 1, height: '1px', background: '#E0E5F2' }}></div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#2B3674', marginBottom: '6px', display: 'block' }}>Imię i Nazwisko Odbiorcy</label>
                                    <input
                                        type="text"
                                        value={transferData.receiver_name}
                                        onChange={(e) => setTransferData({ ...transferData, receiver_name: e.target.value, receiver_id: '' })}
                                        placeholder=""
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E0E5F2', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>

                                <hr style={{ border: 'none', height: '1px', background: '#E0E5F2', margin: '5px 0' }} />

                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#2B3674', marginBottom: '6px', display: 'block' }}>Kwota</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={transferData.amount}
                                        onChange={handleTransferChange}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #E0E5F2', fontSize: '16px', fontWeight: '700', color: '#1B2559', outline: 'none' }}
                                    />
                                </div>

                                <hr style={{ border: 'none', height: '1px', background: '#E0E5F2', margin: '5px 0' }} />

                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#2B3674', marginBottom: '6px', display: 'block' }}>Typ realizacji</label>
                                    <select
                                        name="typ_przelewu"
                                        value={transferData.typ_przelewu}
                                        onChange={(e) => setTransferData({ ...transferData, typ_przelewu: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E0E5F2', fontSize: '14px', backgroundColor: 'white', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="natychmiastowy">Natychmiastowy</option>
                                        <option value="zaplanowany">Przelew z datą przyszłą</option>
                                        <option value="cykliczny">Zlecenie stałe</option>
                                    </select>
                                </div>

                                {transferData.typ_przelewu !== 'natychmiastowy' && (
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#2B3674', marginBottom: '6px', display: 'block' }}>Data i godzina zlecenia</label>
                                        <input
                                            type="datetime-local"
                                            min={terazLokalnie}
                                            value={transferData.data_wykonania}
                                            onChange={(e) => setTransferData({ ...transferData, data_wykonania: e.target.value })}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #4318FF', fontSize: '14px', color: '#2B3674', outline: 'none', fontWeight: '600' }}
                                        />
                                    </div>
                                )}

                                <button type="submit" style={{ background: '#4318FF', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '10px', boxShadow: '0px 4px 12px rgba(67, 24, 255, 0.25)' }}>
                                    Zleć przelew
                                </button>
                            </form>
                        </div>
                    </div>

                    <div style={{ flex: '1.8', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', minHeight: '500px' }}>
                        <h3 style={{ color: '#1E3A8A', marginBottom: '20px', fontSize: '20px' }}>Historia operacji</h3>

                        {dashboardData.history.length === 0 ? (
                            <p style={{ color: '#A3AED0', textAlign: 'center', marginTop: '50px' }}>Brak transakcji na koncie.</p>
                        ) : (
                            <div style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Data</th>
                                            <th style={{ textAlign: 'left', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Typ / Konto</th>
                                            <th style={{ textAlign: 'left', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Status Operacji</th>
                                            <th style={{ textAlign: 'right', padding: '12px 10px', color: '#A3AED0', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>Kwota</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.history.map((tx) => (
                                            <tr key={tx.id}>
                                                <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0', fontSize: '13px', color: '#475569' }}>{tx.data}</td>
                                                <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0' }}>
                                                    <div style={{ fontWeight: '600', color: '#2B3674', fontSize: '14px' }}>Przelew {tx.typ}</div>
                                                    <div style={{ fontSize: '12px', color: '#4318FF', fontWeight: '500' }}>Realizacja: {tx.status_operacji}</div>
                                                    <div style={{ fontSize: '12px', color: '#A3AED0' }}>Konto powiązane: #{tx.kontrahent}</div>
                                                </td>
                                                <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0' }}>
                                                    {tx.status_operacji === 'Zaplanowana' && (
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', fontSize: '12px', fontWeight: '600' }}>
                                                            <i className="fa-regular fa-calendar-check" style={{ marginRight: '4px' }}></i> Zaplanowany
                                                        </span>
                                                    )}
                                                    {tx.status_operacji === 'Cykliczna' && (
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#F3E8FF', color: '#6B21A8', fontSize: '12px', fontWeight: '600' }}>
                                                            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px' }}></i> Zlecenie stałe
                                                        </span>
                                                    )}
                                                    {tx.status_operacji === 'Zrealizowana' && (
                                                        <>
                                                            {tx.status_analizy === 'Oczekujaca' && <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontSize: '12px', fontWeight: '600' }}>Weryfikacja AML</span>}
                                                            {tx.status_analizy === 'Zablokowana' && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#FEE2E2', color: '#EF4444', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>Wstrzymano</span>
                                                                    <button onClick={() => handleUnblock(tx.id, tx.kontrahent)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#10B981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Zgłoś do weryfikacji</button>
                                                                </div>
                                                            )}
                                                            {tx.status_analizy === 'Do_Weryfikacji' && <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#E0E7FF', color: '#4338CA', fontSize: '12px', fontWeight: '600' }}>Weryfikacja przez pracownika</span>}
                                                            {(tx.status_analizy !== 'Oczekujaca' && tx.status_analizy !== 'Zablokowana' && tx.status_analizy !== 'Do_Weryfikacji') && <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#16A34A', fontSize: '12px', fontWeight: '600' }}>Czysty</span>}
                                                        </>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px 10px', borderBottom: '1px solid #E2E8F0', textAlign: 'right', fontWeight: '700', color: tx.typ === 'Wychodzący' ? '#EF4444' : '#16A34A' }}>
                                                    {tx.typ === 'Wychodzący' ? '-' : '+'}{tx.kwota.toFixed(2)} PLN
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}