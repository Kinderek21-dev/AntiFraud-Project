import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ analyzed: '...', anomalies: 0 });
    const [filter, setFilter] = useState('live');
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            { label: 'Transakcje', data: [], borderColor: '#1E3A8A', backgroundColor: 'white', borderWidth: 2, tension: 0.4, yAxisID: 'y' },
            { label: 'Anomalie', data: [], borderColor: '#EF4444', backgroundColor: 'white', borderWidth: 2, tension: 0.4, yAxisID: 'y1' }
        ]
    });

    const currentDate = new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/stats');
            if (response.ok) {
                const data = await response.json();
                setStats({ analyzed: data.analyzed_transactions.toLocaleString('pl-PL'), anomalies: data.detected_anomalies || 0 });
            }
        } catch (error) { console.error("Błąd statystyk:", error); }
    };

    const fetchChart = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/chart?filter=${filter}`);
            if (response.ok) {
                const data = await response.json();
                setChartData(prev => ({
                    ...prev,
                    labels: data.labels,
                    datasets: [
                        { ...prev.datasets[0], data: data.transactions },
                        { ...prev.datasets[1], data: data.anomalies }
                    ]
                }));
            }
        } catch (error) { console.error("Błąd wykresu:", error); }
    };

    useEffect(() => {
        fetchStats();
        fetchChart();
        const interval = setInterval(() => { fetchStats(); fetchChart(); }, 5000);
        return () => clearInterval(interval);
    }, [filter]);

    const chartOptions = {
        responsive: true, interaction: { mode: 'index', intersect: false },
        scales: {
            y: { type: 'linear', display: true, position: 'left', grid: { color: '#E2E8F0' } },
            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
        },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }
    };

    const styles = `
        .dashboard-body { display: flex; height: 100vh; background-color: #F4F7FE; color: #2B3674; width: 100vw;}
        .sidebar { width: 260px; background-color: #1E3A8A; color: white; display: flex; flex-direction: column; padding: 30px 20px; }
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
        .alerts-section { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); min-height: 200px; }
        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #1E3A8A; display: flex; justify-content: space-between; align-items: center;}
    `;

    return (
        <div className="dashboard-body">
            <style>{styles}</style>
            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item active"><i className="fa-solid fa-border-all"></i> Panel Główny</div>
                <div className="nav-item"><i className="fa-solid fa-triangle-exclamation"></i> Alerty AML</div>
                <div className="nav-item"><i className="fa-solid fa-chart-simple"></i> Statystyki</div>
                <div className="nav-item"><i className="fa-solid fa-gear"></i> Ustawienia</div>
                <div className="sidebar-bottom">
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj</div>
                </div>
            </aside>
            <main className="main-content">
                <header className="topbar">
                    <div className="search-bar">
                        <i className="fa-solid fa-magnifying-glass" style={{color: '#A3AED0'}}></i>
                        <input type="text" placeholder="Szukaj..." />
                    </div>
                    <div className="topbar-right">
                        <div className="notification"><i className="fa-regular fa-bell"></i><span className="badge"></span></div>
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
                            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer'}}>
                                <option value="live">Live (Ostatnie minuty)</option>
                                <option value="days">Historia (Dni)</option>
                            </select>
                        </div>
                        <Line data={chartData} options={chartOptions} height={80} />
                    </div>
                    <div className="alerts-section">
                        <div className="section-title">Ostatnie Alerty</div>
                        <p style={{color: '#A3AED0'}}>Brak alertów oczekujących na weryfikację. System monitoruje ruch na bieżąco.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}