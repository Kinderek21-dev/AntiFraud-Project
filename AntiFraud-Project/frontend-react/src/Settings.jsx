import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();
    const [threshold, setThreshold] = useState(0.85);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch('http://localhost:8000/api/settings')
            .then(res => res.json())
            .then(data => setThreshold(data.threshold))
            .catch(err => console.error(err));
    }, []);

    const handleThresholdChange = async (e) => {
        const newValue = parseFloat(e.target.value);
        setThreshold(newValue);
        setIsSaving(true);

        try {
            await fetch('http://localhost:8000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threshold: newValue })
            });
            setTimeout(() => setIsSaving(false), 500); 
        } catch (error) {
            console.error("Błąd zapisu suwaka:", error);
        }
    };

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
        .page-subtitle { color: #A3AED0; font-size: 15px; }

        .settings-card { background: white; border-radius: 15px; padding: 35px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); margin-bottom: 30px;}
        .settings-card h3 { font-size: 18px; color: #1E3A8A; margin-bottom: 8px; }
        .settings-card p { color: #A3AED0; font-size: 14px; margin-bottom: 30px; }

        .slider-container { display: flex; align-items: center; gap: 20px; background: #F8FAFC; padding: 30px; border-radius: 12px; margin-bottom: 20px;}
        input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #1E3A8A; cursor: pointer; margin-top: -6px; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #CBD5E1; border-radius: 2px; }
        .value-badge { background: white; border: 1px solid #E2E8F0; padding: 10px 20px; border-radius: 8px; font-weight: 700; color: #1E3A8A; font-size: 16px; width: 80px; text-align: center; }

        .info-box { display: flex; gap: 10px; color: #4A5568; font-size: 14px; align-items: flex-start;}
        .info-box i { color: #3B82F6; margin-top: 2px; }

        .theme-buttons { display: flex; gap: 15px; }
        .theme-btn { padding: 10px 30px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; color: #2B3674; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .theme-btn.active { background: #1E3A8A; color: white; border-color: #1E3A8A; }
    `;

    return (
        <div className="dashboard-body">
            <style>{styles}</style>
            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-border-all"></i> Dashboard</div>
                <div className="nav-item" onClick={() => navigate('/alerts')}><i className="fa-solid fa-triangle-exclamation"></i> Alerty AML</div>
                <div className="nav-item" onClick={() => navigate('/statistics')}><i className="fa-solid fa-chart-simple"></i> Statystyki</div>
                <div className="nav-item" onClick={() => navigate('/transactions')}><i className="fa-solid fa-book-journal-whills"></i> Rejestr Transakcji</div>
                <div className="nav-item active"><i className="fa-solid fa-gear"></i> Ustawienia</div>
                <div className="nav-item" onClick={() => navigate('/blacklist')}><i className="fa-solid fa-ban"></i> Zablokowani</div>
                <div className="sidebar-bottom">
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj</div>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-header">
                    <div className="page-title">Ustawienia Systemu</div>
                    <div className="page-subtitle">Zarządzaj konfiguracją aplikacji oraz profilem administratora.</div>
                </div>

                <div className="settings-card">
                    <h3>Konfiguracja Sztucznej Inteligencji (ML)</h3>
                    <p>Dostosuj czułość modeli wykrywania anomalii, co wpłynie na ilość przyszłych alertów.</p>

                    <div style={{ fontWeight: 600, marginBottom: '15px' }}>Próg Anomalii (0.0 - 1.0)</div>
                    <div className="slider-container">
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={threshold}
                            onChange={handleThresholdChange}
                        />
                        <div className="value-badge">
                            {isSaving ? "..." : threshold.toFixed(2)}
                        </div>
                    </div>
                    <div className="info-box">
                        <i className="fa-solid fa-circle-info"></i>
                        Wyższe wartości oznaczają mniej alertów, ale mogą zwiększyć ryzyko pominięcia oszustwa (false negatives).
                        Obecne ustawienie faworyzuje {threshold >= 0.8 ? "wysoką precyzję" : "wysoką czułość"}.
                    </div>
                </div>

                <div className="settings-card">
                    <h3>Motyw Systemu</h3>
                    <p>Wybierz preferowany wygląd interfejsu.</p>
                    <div className="theme-buttons">
                        <button className="theme-btn">Jasny</button>
                        <button className="theme-btn">Ciemny</button>
                        <button className="theme-btn active">Systemowy</button>
                    </div>
                </div>
            </main>
        </div>
    );
}