import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1d3b8a', '#d32f2f']; 

export default function TransactionStatistics() {
    const navigate = useNavigate();
    const [volumeData, setVolumeData] = useState([]);
    const [distributionData, setDistributionData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/statistics');
                if (response.ok) {
                    const data = await response.json();
                    setVolumeData(data.volumeData);
                    setDistributionData(data.distributionData);
                }
            } catch (error) {
                console.error("Błąd API:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStatistics();
    }, []);

    const styles = `
        .dashboard-body { display: flex; height: 100vh; background-color: #F4F7FE; color: #2B3674; width: 100vw; overflow: hidden; }
        .sidebar { width: 260px; background-color: #1E3A8A; color: white; display: flex; flex-direction: column; padding: 30px 20px; flex-shrink: 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; }
        .nav-item { padding: 15px; margin-bottom: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px; color: #A3B1CC; transition: 0.3s; }
        .nav-item:hover, .nav-item.active { background-color: rgba(255,255,255,0.1); color: white; font-weight: 600; }
        .sidebar-bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; }
        .page-header { margin-bottom: 30px; }
        .page-title { font-size: 24px; font-weight: 700; color: #1E3A8A; margin-bottom: 8px;}
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
                    <div className="page-title">Statystyki Transakcji</div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#A3AED0' }}>Ładowanie statystyk...</div>
                ) : (
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        
                        <div style={{ flex: 2, minWidth: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#1E3A8A' }}>Wolumen Transakcji (Ostatnie 7 Dni)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={volumeData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                                    <Tooltip formatter={(value) => `${value.toLocaleString()} PLN`} />
                                    <Bar dataKey="value" fill="#1d3b8a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ flex: 1, minWidth: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#1E3A8A' }}>Dystrybucja: Normalne vs Anomalie</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={distributionData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#1d3b8a', fontWeight: 'bold' }}>
                                    <div style={{ width: '12px', height: '12px', backgroundColor: '#1d3b8a', marginRight: '5px', borderRadius: '2px' }}></div>
                                    Normalne ({distributionData[0]?.value || 0})
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#d32f2f', fontWeight: 'bold' }}>
                                    <div style={{ width: '12px', height: '12px', backgroundColor: '#d32f2f', marginRight: '5px', borderRadius: '2px' }}></div>
                                    Anomalie ({distributionData[1]?.value || 0})
                                </span>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}