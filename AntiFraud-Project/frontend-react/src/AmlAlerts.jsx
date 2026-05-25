import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';

export default function AmlAlerts() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showGraph, setShowGraph] = useState(false);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });

    const [riskFilter, setRiskFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchGraphData = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/graph');
            if (res.ok) {
                const data = await res.json();
                setGraphData(data);
                setShowGraph(true);
            }
        } catch (error) { console.error("Błąd pobierania grafu:", error); }
    };

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

    const filteredAlerts = alerts.filter(a => {
        const matchSearch =
            a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(a.nadawca).includes(searchTerm) ||
            String(a.odbiorca).includes(searchTerm);

        let matchRisk = true;
        const score = parseFloat(a.score);
        if (riskFilter === 'critical') matchRisk = score >= 0.90;
        if (riskFilter === 'high') matchRisk = score >= 0.80;

        let matchDateFrom = true;
        let matchDateTo = true;
        const alertDate = new Date(a.date);
        if (dateFrom) matchDateFrom = alertDate >= new Date(dateFrom);
        if (dateTo) matchDateTo = alertDate <= new Date(dateTo + 'T23:59:59');

        return matchSearch && matchRisk && matchDateFrom && matchDateTo;
    });

    const exportToCSV = () => {
        const headers = ["ID Alertu", "Data", "Typ Alertu", "Wynik (ML)", "Status", "Kwota (PLN)", "Konto Nadawcy", "Konto Odbiorcy"];
        const csvRows = [headers.join(",")];
        filteredAlerts.forEach(a => {
            csvRows.push(`${a.id},${a.date},"${a.type}",${a.score},${a.status},${a.kwota},${a.nadawca},${a.odbiorca}`);
        });
        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AntiFraud_Raport_Sledczy_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

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
        
        .filters-bar { background: white; padding: 20px; border-radius: 15px; display: flex; gap: 20px; align-items: flex-end; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); flex-wrap: wrap; }
        .filter-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 180px; }
        .filter-group label { font-size: 12px; font-weight: 600; color: #A3AED0; text-transform: uppercase; }
        .filter-input { padding: 10px 15px; border-radius: 8px; border: 1px solid #E2E8F0; background: #F8FAFC; outline: none; font-size: 14px; color: #2B3674; width: 100%; box-sizing: border-box; }
        
        .search-box { display: flex; align-items: center; background: #F8FAFC; padding: 10px 15px; border-radius: 8px; border: 1px solid #E2E8F0; }
        .search-box input { border: none; background: transparent; outline: none; margin-left: 10px; width: 100%; color: #2B3674; font-size: 14px; }
        
        .btn-export { background: #1E3A8A; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; white-space: nowrap; height: fit-content; }
        .btn-export:hover { background: #152c6b; }
        
        .alerts-table-container { background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow-y: auto; max-height: calc(100vh - 280px); }
        .alerts-table { width: 100%; border-collapse: collapse; }
        .alerts-table th { position: sticky; top: 0; background: #F8FAFC; z-index: 10; text-align: left; padding: 15px 30px; color: #A3AED0; font-size: 12px; font-weight: 600; border-bottom: 2px solid #E2E8F0; text-transform: uppercase; }
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
                
                <div className={`nav-item ${window.location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
                    <i className="fa-solid fa-border-all"></i> Dashboard
                </div>
                <div className={`nav-item ${window.location.pathname === '/alerts' ? 'active' : ''}`} onClick={() => navigate('/alerts')}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Alerty AML
                </div>
                <div className={`nav-item ${window.location.pathname === '/transactions' ? 'active' : ''}`} onClick={() => navigate('/transactions')}>
                    <i className="fa-solid fa-book-journal-whills"></i> Rejestr Transakcji
                </div>
                <div className={`nav-item ${window.location.pathname === '/blacklist' ? 'active' : ''}`} onClick={() => navigate('/blacklist')}>
                    <i className="fa-solid fa-user-lock"></i> Zablokowani
                </div>
                <div className={`nav-item ${window.location.pathname === '/insider-threat' ? 'active' : ''}`} onClick={() => navigate('/insider-threat')}>
                    <i className="fa-solid fa-user-secret"></i> Zagrożenia Wewnętrzne
                </div>
                <div className={`nav-item ${window.location.pathname === '/statistics' ? 'active' : ''}`} onClick={() => navigate('/statistics')}>
                    <i className="fa-solid fa-chart-simple"></i> Statystyki
                </div>
                <div className={`nav-item ${window.location.pathname === '/settings' ? 'active' : ''}`} onClick={() => navigate('/settings')}>
                    <i className="fa-solid fa-gear"></i> Ustawienia
                </div>
                
                <div className="sidebar-bottom">
                    <div className="nav-item" onClick={() => navigate('/')}>
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-header">
                    <div className="page-title">Historia Alertów AML</div>
                    <button className="btn-export" onClick={exportToCSV}>
                        <i className="fa-solid fa-download"></i> Eksportuj Raport CSV
                    </button>
                </div>

                <div className="filters-bar">
                    <div className="filter-group" style={{ flex: 2 }}>
                        <label>Wyszukaj w bazie</label>
                        <div className="search-box">
                            <i className="fa-solid fa-magnifying-glass" style={{ color: '#A3AED0' }}></i>
                            <input type="text" placeholder="ID konta, alertu lub typ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Poziom Ryzyka</label>
                        <select className="filter-input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                            <option value="all">Wszystkie wykryte</option>
                            <option value="high">Wysokie ryzyko (≥ 0.80)</option>
                            <option value="critical">Krytyczne oszustwa (≥ 0.90)</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Data Od</label>
                        <input type="date" className="filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>

                    <div className="filter-group">
                        <label>Data Do</label>
                        <input type="date" className="filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#A3AED0' }}>Brak alertów spełniających kryteria wyszukiwania.</td></tr>
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
                        {selectedAlert.xai && selectedAlert.xai.length > 0 && (
                            <div style={{ marginTop: '20px', padding: '15px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <strong style={{ color: '#1E3A8A', fontSize: '13px', textTransform: 'uppercase' }}>
                                    <i className="fa-solid fa-microchip"></i> XAI: Wpływ cech na decyzję modelu
                                </strong>
                                <div style={{ marginTop: '15px' }}>
                                    {selectedAlert.xai.map((item, idx) => (
                                        <div key={idx} style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '5px', fontWeight: '500' }}>
                                                <span>{item.cecha}</span>
                                                <span style={{ color: item.kolor, fontWeight: '700' }}>+{item.wplyw}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${item.wplyw}%`, height: '100%', background: item.kolor, borderRadius: '4px' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button
                            className="btn-export"
                            style={{ marginTop: '20px', width: '100%', justifyContent: 'center', background: '#2B3674' }}
                            onClick={fetchGraphData}
                        >
                            <i className="fa-solid fa-network-wired"></i> Pokaż graf powiązań
                        </button>
                    </div>
                </div>
            )}

            {showGraph && (
                <div className="modal-overlay" onClick={() => setShowGraph(false)}>
                    <div className="modal-content" style={{ width: '85vw', height: '85vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0f172a' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px', background: '#1E3A8A', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}><i className="fa-solid fa-diagram-project"></i> Interaktywna Sieć Transakcji</h3>
                            <button className="close-btn" style={{ color: 'white' }} onClick={() => setShowGraph(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <ForceGraph2D
                                graphData={graphData}
                                nodeLabel="name"
                                nodeColor={() => '#3b82f6'}
                                linkColor={link => link.color}
                                linkWidth={link => link.color === '#EF4444' ? 3 : 1}
                                linkDirectionalArrowLength={6}
                                linkDirectionalArrowRelPos={1}
                                width={window.innerWidth * 0.85}
                                height={window.innerHeight * 0.85 - 65}
                            />
                            <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '8px', color: 'white', fontSize: '12px' }}>
                                <div><span style={{ color: '#EF4444', fontWeight: 'bold' }}>—</span> Wykryte Anomalie / Cykle</div>
                                <div><span style={{ color: '#475569', fontWeight: 'bold' }}>—</span> Normalne Transakcje</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}