import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AmlAlerts() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAlert, setSelectedAlert] = useState(null);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/alerts/history');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setAlerts(data);
            }
        } catch (error) { console.error("Błąd API:", error); }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        setAlerts(alerts.map(alert => alert.id === id ? { ...alert, status: newStatus } : alert));
        try {
            await fetch(`http://localhost:8000/api/alerts/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) { console.error("Błąd zapisu statusu:", error); }
    };

    const exportToCSV = () => {
        const headers = ["ID Alertu", "Data", "Typ Alertu", "Wynik (ML)", "Status", "Kwota (PLN)", "Konto Nadawcy", "Konto Odbiorcy"];
        const csvRows = [headers.join(",")];
        alerts.forEach(a => {
            csvRows.push(`${a.id},${a.date},"${a.type}",${a.score},${a.status},${a.kwota},${a.nadawca},${a.odbiorca}`);
        });
        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'AntiFraud_Historia_Alertow.csv';
        a.click();
    };

    const filteredAlerts = alerts.filter(a => a.id.toLowerCase().includes(searchTerm.toLowerCase()) || a.type.toLowerCase().includes(searchTerm.toLowerCase()));

    const styles = `
        .dashboard-body { display: flex; height: 100vh; background-color: #F4F7FE; color: #2B3674; width: 100vw; overflow: hidden; }
        .sidebar { width: 260px; background-color: #1E3A8A; color: white; display: flex; flex-direction: column; padding: 30px 20px; flex-shrink: 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; }
        .nav-item { padding: 15px; margin-bottom: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px; color: #A3B1CC; transition: 0.3s; }
        .nav-item:hover, .nav-item.active { background-color: rgba(255,255,255,0.1); color: white; font-weight: 600; }
        .sidebar-bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
        .main-content { flex: 1; display: flex; flex-direction: column; padding: 40px; overflow: hidden; } 
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 24px; font-weight: 700; color: #1E3A8A; }
        .filters-bar { background: white; padding: 20px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .search-box { display: flex; align-items: center; background: #F4F7FE; padding: 10px 15px; border-radius: 8px; width: 350px; }
        .search-box input { border: none; background: transparent; outline: none; margin-left: 10px; width: 100%; }
        .btn-export { background: #1E3A8A; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-export:hover { background: #152c6b; }
        .alerts-table-container { 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.03); 
            overflow-y: auto; 
            max-height: calc(100vh - 230px);
        }
        .alerts-table { width: 100%; border-collapse: collapse; }
        
        .alerts-table th { 
            position: sticky; 
            top: 0; 
            background: #F8FAFC; 
            z-index: 10; 
            text-align: left; padding: 15px 30px; color: #A3AED0; font-size: 12px; font-weight: 600; border-bottom: 2px solid #E2E8F0; text-transform: uppercase; 
        }
        
        .alerts-table td { padding: 18px 30px; border-bottom: 1px solid #E2E8F0; color: #2B3674; font-size: 14px; font-weight: 500; }
        .score-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 13px; }
        .score-red { background-color: #FEE2E2; color: #EF4444; }
        .score-orange { background-color: #FEF3C7; color: #F59E0B; }
        .status-select { padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid #E2E8F0; outline: none; cursor: pointer; }
        .btn-outline { padding: 8px 16px; border-radius: 8px; border: 1px solid #1E3A8A; color: #1E3A8A; background: transparent; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; }
        .btn-outline:hover { background: #1E3A8A; color: white; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white; width: 500px; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #E2E8F0; padding-bottom: 10px; }
        .modal-header h3 { color: #1E3A8A; margin: 0; }
        .close-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #A3AED0; }
        .detail-row { margin-bottom: 15px; }
        .detail-label { font-size: 12px; color: #A3AED0; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
        .detail-value { font-size: 15px; color: #2B3674; font-weight: 500; }
        .reason-box { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 4px; margin-top: 20px; color: #991B1B; font-size: 14px; font-weight: 500;}
    `;

    return (
        <div className="dashboard-body">
            <style>{styles}</style>

            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-border-all"></i> Dashboard</div>
                <div className="nav-item active"><i className="fa-solid fa-triangle-exclamation"></i> Alerty AML</div>
                <div className="nav-item" onClick={() => navigate('/statistics')}><i className="fa-solid fa-chart-simple"></i> Statystyki</div>
                <div className="nav-item" onClick={() => navigate('/settings')}><i className="fa-solid fa-gear"></i> Ustawienia</div>
                <div className="sidebar-bottom">
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj</div>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-header">
                    <div className="page-title">Historia Alertów AML</div>
                    <button className="btn-export" onClick={exportToCSV}>
                        <i className="fa-solid fa-download"></i> Eksportuj CSV
                    </button>
                </div>

                <div className="filters-bar">
                    <div className="search-box">
                        <i className="fa-solid fa-magnifying-glass" style={{ color: '#A3AED0' }}></i>
                        <input type="text" placeholder="Szukaj po ID lub typie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="alerts-table-container">
                    <table className="alerts-table">
                        <thead>
                            <tr>
                                <th>ID Alertu</th>
                                <th>Data utworzenia</th>
                                <th>Typ Alertu</th>
                                <th>Wynik (ML)</th>
                                <th>Status</th>
                                <th>Akcja</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAlerts.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#A3AED0' }}>Brak alertów dla obecnego progu czułości.</td></tr>
                            ) : filteredAlerts.map(alert => (
                                <tr key={alert.id}>
                                    <td style={{ color: '#4318FF', fontWeight: '600' }}>{alert.id}</td>
                                    <td>{alert.date}</td>
                                    <td>{alert.type}</td>
                                    <td><span className={`score-badge ${parseFloat(alert.score) >= 0.90 ? 'score-red' : 'score-orange'}`}>{alert.score}</span></td>
                                    <td>
                                        <select className="status-select" value={alert.status} onChange={(e) => handleStatusChange(alert.id, e.target.value)}>
                                            <option value="New">Nowy</option>
                                            <option value="Positive verification">Zablokowane</option>
                                            <option value="False Positive">Fałszywy alarm</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button className="btn-outline" onClick={() => setSelectedAlert(alert)}>Szczegóły</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {selectedAlert && (
                <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Szczegóły Alertu: {selectedAlert.id}</h3>
                            <button className="close-btn" onClick={() => setSelectedAlert(null)}><i className="fa-solid fa-xmark"></i></button>
                        </div>

                        <div className="detail-row">
                            <div className="detail-label">Czas Transakcji</div>
                            <div className="detail-value">{selectedAlert.date}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '50px' }}>
                            <div className="detail-row">
                                <div className="detail-label">ID Nadawcy</div>
                                <div className="detail-value"><i className="fa-solid fa-user-minus" style={{ color: '#EF4444' }}></i> Konto #{selectedAlert.nadawca}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">ID Odbiorcy</div>
                                <div className="detail-value"><i className="fa-solid fa-user-plus" style={{ color: '#22C55E' }}></i> Konto #{selectedAlert.odbiorca}</div>
                            </div>
                        </div>
                        <div className="detail-row">
                            <div className="detail-label">Kwota Transakcji</div>
                            <div className="detail-value" style={{ fontSize: '20px', fontWeight: '700' }}>{selectedAlert.kwota} PLN</div>
                        </div>

                        <div className="reason-box">
                            <strong><i className="fa-solid fa-robot"></i> Diagnoza Sztucznej Inteligencji:</strong><br />
                            {selectedAlert.reason}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}