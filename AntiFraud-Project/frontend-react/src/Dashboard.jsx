import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

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
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [filter]);

    const handleStatusChange = async (id, newStatus) => {
        setAlerts(alerts.map(alert => alert.id === id ? { ...alert, status: newStatus } : alert));

        try {
            await fetch(`http://localhost:8000/api/alerts/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Błąd zapisu statusu:", error);
        }
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

    return (
        <div className="dashboard-body">
            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item active" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-border-all"></i> Dashboard</div>
                <div className="nav-item" onClick={() => navigate('/alerts')}><i className="fa-solid fa-triangle-exclamation"></i> Alerty AML</div>
                <div className="nav-item" onClick={() => navigate('/statistics')}><i className="fa-solid fa-chart-simple"></i> Statystyki</div>
                <div className="nav-item" onClick={() => navigate('/transactions')}><i className="fa-solid fa-book-journal-whills"></i> Rejestr Transakcji</div>
                <div className="nav-item" onClick={() => navigate('/settings')}><i className="fa-solid fa-gear"></i> Ustawienia</div>
                <div className="nav-item" onClick={() => navigate('/blacklist')}><i className="fa-solid fa-ban"></i> Zablokowani</div>
                <div className="sidebar-bottom">
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj</div>
                </div>
            </aside>
            <main className="main-content">
                <header className="topbar">
                    <div className="search-bar">
                        <i className="fa-solid fa-magnifying-glass" style={{ color: '#A3AED0' }}></i>
                        <input type="text" placeholder="Szukaj..." />
                    </div>
                    <div className="topbar-right">
                        <div className="notification"><i className="fa-regular fa-bell"></i><span className="badge">3</span></div>
                        <div>{currentDate}</div>
                    </div>
                </header>
                <div className="dashboard-content">
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-title"><i className="fa-solid fa-chart-line" style={{ color: '#4318FF' }}></i> Przeanalizowane transakcje</div>
                            <div className="kpi-value">{stats.analyzed}</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-title"><i className="fa-solid fa-triangle-exclamation" style={{ color: '#FFB547' }}></i> Wykryte anomalie (ML)</div>
                            <div className="kpi-value">{stats.anomalies}</div>
                        </div>
                    </div>

                    <div className="chart-section">
                        <div className="section-title">
                            Ruch Transakcji vs Anomalie
                            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, color: '#1E3A8A' }}>
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
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#A3AED0' }}>Oczekiwanie na analizę transakcji przez AI...</td></tr>
                                ) : alerts.map(alert => (
                                    <tr key={alert.id}>
                                        <td style={{ color: '#4318FF' }}>{alert.id}</td>
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