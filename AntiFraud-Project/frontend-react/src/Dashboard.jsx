import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Rejestracja modułów Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ analyzed: '...', anomalies: 0 });
    const [filter, setFilter] = useState('live');
    const [alerts, setAlerts] = useState([]);
    
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            { label: 'Transakcje', data: [], borderColor: '#1E3A8A', backgroundColor: 'white', borderWidth: 2, tension: 0.4, yAxisID: 'y' },
            { label: 'Anomalie', data: [], borderColor: '#EF4444', backgroundColor: 'white', borderWidth: 2, tension: 0.4, yAxisID: 'y1' }
        ]
    });

    const currentDate = new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const fetchData = async () => {
        try {
            const resStats = await fetch('http://localhost:8000/api/stats');
            if (resStats.ok) {
                const data = await resStats.json();
                setStats({ 
                    analyzed: data.analyzed_transactions.toLocaleString('pl-PL'), 
                    anomalies: data.detected_anomalies 
                });
            }
            
            const resChart = await fetch(`http://localhost:8000/api/chart?filter=${filter}`);
            if (resChart.ok) {
                const data = await resChart.json();
                setChartData(prev => ({
                    ...prev, 
                    labels: data.labels,
                    datasets: [
                        { ...prev.datasets[0], data: data.transactions },
                        { ...prev.datasets[1], data: data.anomalies }
                    ]
                }));
            }
            
            const resAlerts = await fetch('http://localhost:8000/api/alerts');
            if (resAlerts.ok) {
                const data = await resAlerts.json();
                // Zabezpieczenie przed błędem mapowania (alerts.map)
                if (Array.isArray(data)) {
                    setAlerts(data);
                } else {
                    console.error("API nie zwróciło listy alertów:", data);
                    setAlerts([]);
                }
            }
            
        } catch (error) { 
            console.error("Błąd połączenia z API:", error); 
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Odświeżanie co 5 sekund
        return () => clearInterval(interval);
    }, [filter]);

    // Obsługa zmiany statusu w tabeli
    const handleStatusChange = (id, newStatus) => {
        setAlerts(alerts.map(alert => alert.id === id ? { ...alert, status: newStatus } : alert));
    };

    const chartOptions = {
        responsive: true, 
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: { type: 'linear', display: true, position: 'left', grid: { color: '#E2E8F0' } },
            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0 }
        },
        plugins: { 
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } 
        }
    };

    const styles = `
        .dashboard-body { display: flex; height: 100vh; background-color: #F4F7FE; color: #2B3674; width: 100vw; overflow: hidden; }
        .sidebar { width: 260px; background-color: #1E3A8A; color: white; display: flex; flex-direction: column; padding: 30px 20px; flex-shrink: 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; }
        .nav-item { padding: 15px; margin-bottom: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px; color: #A3B1CC; transition: 0.3s; }
        .nav-item:hover, .nav-item.active { background-color: rgba(255,255,255,0.1); color: white; font-weight: 600; }
        .sidebar-bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
        .topbar { background-color: transparent; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
        .search-bar { background: white; padding: 10px 20px; border-radius: 20px; display: flex; align-items: center; gap: 10px; width: 300px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
        .search-bar input { border: none; outline: none; background: transparent; width: 100%; }
        .topbar-right { display: flex; align-items: center; gap: 20px; font-weight: 500; }
        .notification { position: relative; cursor: pointer; font-size: 20px;}
        .badge { position: absolute; top: -5px; right: -5px; background: #EF4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 50%; }
        .dashboard-content { padding: 0 40px 40px 40px; }
        .kpi-grid { display: flex; gap: 20px; margin-bottom: 30px; }
        .kpi-card { background: white; flex: 1; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px; }
        .kpi-title { font-size: 14px; color: #A3AED0; font-weight: 500; display: flex; align-items: center; gap: 8px;}
        .kpi-value { font-size: 32px; font-weight: 700; color: #1E3A8A; }
        .chart-section { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #1E3A8A; display: flex; justify-content: space-between; align-items: center;}
        
        /* Style tabeli alertów (zgodne z Figmą) */
        .alerts-section { background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 40px; overflow: hidden; }
        .alerts-header { padding: 25px 30px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
        .alerts-header h2 { font-size: 18px; color: #1E3A8A; margin: 0; }
        .view-all { color: #4318FF; text-decoration: none; font-weight: 600; font-size: 14px; cursor: pointer; }
        
        .alerts-table { width: 100%; border-collapse: collapse; }
        .alerts-table th { text-align: left; padding: 15px 30px; color: #A3AED0; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; border-bottom: 1px solid #E2E8F0; text-transform: uppercase; }
        .alerts-table td { padding: 18px 30px; border-bottom: 1px solid #E2E8F0; color: #2B3674; font-size: 14px; font-weight: 500; vertical-align: middle; }
        .alerts-table tr:last-child td { border-bottom: none; }
        
        .score-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 13px; }
        .score-red { background-color: #FEE2E2; color: #EF4444; }
        .score-orange { background-color: #FEF3C7; color: #F59E0B; }
        
        .status-select { padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid #E2E8F0; outline: none; cursor: pointer; appearance: none; background: transparent; }
        .status-New { background-color: #EFF6FF; color: #3B82F6; border-color: #BFDBFE; }
        .status-Positive { background-color: #FEE2E2; color: #EF4444; border-color: #FECACA; }
        .status-False { background-color: #DCFCE7; color: #22C55E; border-color: #BBF7D0; }
        
        .btn-outline { padding: 8px 16px; border-radius: 8px; border: 1px solid #1E3A8A; color: #1E3A8A; background: transparent; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; }
        .btn-outline:hover { background: #1E3A8A; color: white; }
    `;

    return (
        <div className="dashboard-body">
            <style>{styles}</style>
            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item active" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-border-all"></i> Dashboard</div>
                <div className="nav-item" onClick={() => navigate('/alerts')}><i className="fa-solid fa-triangle-exclamation"></i> AML Alerts</div>
                <div className="nav-item"><i className="fa-solid fa-chart-simple"></i> Transaction Statistics</div>
                <div className="nav-item"><i className="fa-solid fa-gear"></i> Settings</div>
                <div className="sidebar-bottom">
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</div>
                </div>
            </aside>
            <main className="main-content">
                <header className="topbar">
                    <div className="search-bar">
                        <i className="fa-solid fa-magnifying-glass" style={{color: '#A3AED0'}}></i>
                        <input type="text" placeholder="Search..." />
                    </div>
                    <div className="topbar-right">
                        <div className="notification"><i className="fa-regular fa-bell"></i><span className="badge">3</span></div>
                        <div>{currentDate}</div>
                    </div>
                </header>
                <div className="dashboard-content">
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-title"><i className="fa-solid fa-chart-line" style={{color:'#4318FF'}}></i> Przeanalizowane transakcje</div>
                            <div className="kpi-value">{stats.analyzed}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-title"><i className="fa-solid fa-triangle-exclamation" style={{color:'#FFB547'}}></i> Wykryte anomalie (ML)</div>
                            <div className="kpi-value">{stats.anomalies}</div>
                        </div>
                    </div>
                    
                    <div className="chart-section">
                        <div className="section-title">
                            Ruch Transakcji vs Anomalie
                            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, color: '#1E3A8A'}}>
                                <option value="live">Live (Ostatnie minuty)</option>
                                <option value="days">Historia (Dni)</option>
                            </select>
                        </div>
                        <Line data={chartData} options={chartOptions} height={80} />
                    </div>

                    <div className="alerts-section">
                        <div className="alerts-header">
                            <h2>Najnowsze Alerty</h2>
                            <span className="view-all" onClick={() => navigate('/alerts')}>Zobacz wszystkie</span>
                        </div>
                        <table className="alerts-table">
                            <thead>
                                <tr>
                                    <th>ID Alertu</th>
                                    <th>Data utworzenia</th>
                                    <th>Typ Alertu</th>
                                    <th>Wynik anomali (ML)</th>
                                    <th>Status</th>
                                    <th>Akcja</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.length === 0 ? (
                                    <tr><td colSpan="6" style={{textAlign: 'center', color: '#A3AED0'}}>Oczekiwanie na analizę transakcji przez AI...</td></tr>
                                ) : alerts.map(alert => (
                                    <tr key={alert.id}>
                                        <td style={{color: '#4318FF'}}>{alert.id}</td>
                                        <td>{alert.date}</td>
                                        <td>{alert.type}</td>
                                        <td>
                                            <span className={`score-badge ${parseFloat(alert.score) >= 0.90 ? 'score-red' : 'score-orange'}`}>
                                                {alert.score}
                                            </span>
                                        </td>
                                        <td>
                                            <select 
                                                className={`status-select ${alert.status === 'New' ? 'status-New' : alert.status === 'Positive verification' ? 'status-Positive' : 'status-False'}`}
                                                value={alert.status}
                                                onChange={(e) => handleStatusChange(alert.id, e.target.value)}
                                            >
                                                <option value="New">Nowy</option>
                                                <option value="Positive verification">Weryfikacja pozytywna</option>
                                                <option value="False Positive">Fałszywy alarm</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button className="btn-outline" onClick={() => navigate('/alerts')}>Szczegóły</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>
        </div>
    );
}