import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function InsiderThreat() {
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [auditLogData, setAuditLogData] = useState(null);

    const fetchAdmins = () => {
        fetch('http://localhost:8000/api/admin/list')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAdmins(data);
                else setAdmins([]);
            })
            .catch(err => console.error("Błąd pobierania adminów:", err));
    };

    useEffect(() => {
        fetchAdmins();
        const interval = setInterval(fetchAdmins, 5000); 
        return () => clearInterval(interval);
    }, []);

    const suspiciousAdmin = admins.length > 0 
        ? admins.reduce((prev, current) => (prev.resolvedCases > current.resolvedCases) ? prev : current) 
        : null;

    const totalOverrides = admins.reduce((sum, admin) => sum + admin.resolvedCases, 0);
    const suspiciousPatternsCount = (suspiciousAdmin && suspiciousAdmin.resolvedCases > 0) ? 1 : 0;

    const handleSuspend = (id, name) => {
        if(window.confirm(` UWAGA KRYTYCZNA:\nCzy na pewno chcesz natychmiastowo zablokować dostęp do systemu dla analityka: ${name} (ID: ${id})?\n\nObecna sesja użytkownika zostanie wygaszona.`)) {
            alert(` SUKCES: Zabezpieczono system. Konto administratora ${name} zostało permanentnie zawieszone do czasu wyjaśnienia incydentu przez audytorów.`);
        }
    };

    const handleViewLog = async (id) => {
        try {
            const res = await fetch(`http://localhost:8000/api/admin/audit-log/${id}`);
            if(res.ok) {
                const data = await res.json();
                setAuditLogData(data); 
                setIsAuditModalOpen(true); 
            } else {
                alert("Błąd: Nie udało się pobrać logów audytowych z serwera.");
            }
        } catch (e) {
            console.error("Błąd pobierania logu:", e);
        }
    };

    const styles = `
        .dashboard-body { display: flex; height: 100vh; background-color: #F4F7FE; color: #2B3674; width: 100vw; overflow: hidden; font-family: 'Inter', sans-serif; }
        .sidebar { width: 260px; background-color: #1E3A8A; color: white; display: flex; flex-direction: column; padding: 30px 20px; flex-shrink: 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; }
        .nav-item { padding: 15px; margin-bottom: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px; color: #A3B1CC; transition: 0.3s; font-weight: 500;}
        .nav-item:hover, .nav-item.active { background-color: rgba(255,255,255,0.1); color: white; font-weight: 600; }
        .sidebar-bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; padding: 40px; overflow-y: auto; } 
        .page-header { margin-bottom: 30px; }
        .page-title { font-size: 26px; font-weight: 700; color: #1E3A8A; margin-bottom: 5px; }
        .page-subtitle { color: #64748B; font-size: 15px; }

        .threat-alert-box { background: #FEF2F2; border-left: 6px solid #EF4444; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.1); }
        .threat-header { display: flex; align-items: center; gap: 10px; color: #991B1B; font-size: 18px; font-weight: 700; margin-bottom: 20px; }
        .threat-card { background: white; border-radius: 10px; padding: 20px; border: 1px solid #FCA5A5; }
        .admin-profile { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F3F4F6; padding-bottom: 15px; margin-bottom: 15px; }
        .admin-avatar { width: 45px; height: 45px; background: #FEE2E2; color: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
        .risk-badge { background: #FEE2E2; color: #EF4444; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}
        
        .warning-text { color: #991B1B; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        
        .threat-kpis { display: flex; gap: 15px; margin-bottom: 20px; }
        .threat-kpi-card { flex: 1; background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0; }
        .threat-kpi-label { font-size: 12px; color: #64748B; margin-bottom: 5px; }
        .threat-kpi-value { font-size: 22px; font-weight: 700; color: #991B1B; }

        .threat-actions { display: flex; gap: 15px; }
        .btn-suspend { flex: 1; background: #DC2626; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px;}
        .btn-suspend:hover { background: #B91C1C; }
        .btn-audit { flex: 1; background: white; color: #475569; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px;}
        .btn-audit:hover { background: #F1F5F9; }

        .stats-container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); margin-bottom: 30px; }
        .stats-header { font-size: 18px; font-weight: 700; color: #1E3A8A; margin-bottom: 5px; }
        .stats-sub { font-size: 13px; color: #64748B; margin-bottom: 20px; }

        .kpi-row { display: flex; gap: 20px; }
        .kpi-box { flex: 1; background: white; padding: 25px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 2px 10px rgba(0,0,0,0.02); cursor: pointer; transition: 0.2s; position: relative;}
        .kpi-box:hover { border-color: #CBD5E1; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .kpi-box-title { font-size: 14px; color: #475569; font-weight: 500; margin-bottom: 10px; }
        .kpi-box-val { font-size: 32px; font-weight: 700; color: #1E3A8A; }
        .kpi-box-val.red { color: #DC2626; }
        .kpi-icon { position: absolute; top: 25px; right: 25px; font-size: 20px; color: #3B82F6; }
        .kpi-icon.red { color: #DC2626; }
        .kpi-icon.green { color: #10B981; }
        .kpi-link { font-size: 12px; color: #64748B; margin-top: 10px; display: block; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-container { background: white; width: 1000px; max-height: 85vh; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .modal-head { padding: 25px 30px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
        .modal-head h2 { margin: 0; font-size: 20px; color: #1E3A8A; display: flex; align-items: center; gap: 10px;}
        .modal-head p { margin: 5px 0 0 30px; font-size: 13px; color: #64748B; }
        .close-btn { background: none; border: none; font-size: 24px; color: #94A3B8; cursor: pointer; }
        
        .modal-body { padding: 30px; overflow-y: auto; flex: 1; }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { text-align: left; padding: 12px 15px; color: #64748B; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #E2E8F0; }
        .admin-table td { padding: 15px; border-bottom: 1px solid #E2E8F0; font-size: 14px; color: #334155; vertical-align: middle; }
        .status-pill { background: #DCFCE7; color: #16A34A; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .action-btn-view { border: 1px solid #93C5FD; color: #2563EB; background: #EFF6FF; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; margin-right: 8px;}
        .action-btn-suspend { border: 1px solid #FCA5A5; color: #DC2626; background: #FEF2F2; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;}
        
        .modal-footer { padding: 20px 30px; border-top: 1px solid #E2E8F0; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 16px 16px;}
        .footer-warn { color: #B45309; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;}
        .btn-close-modal { background: #1E3A8A; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    `;

    return (
        <div className="dashboard-body">
            <style>{styles}</style>

            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-border-all"></i> Dashboard</div>
                <div className="nav-item" onClick={() => navigate('/alerts')}><i className="fa-solid fa-triangle-exclamation"></i> Alerty AML</div>
                <div className="nav-item" onClick={() => navigate('/transactions')}><i className="fa-solid fa-book-journal-whills"></i> Rejestr Transakcji</div>
                <div className="nav-item active"><i className="fa-solid fa-user-secret"></i> Zagrożenia Wewnętrzne</div>
                <div className="nav-item" onClick={() => navigate('/statistics')}><i className="fa-solid fa-chart-simple"></i> Statystyki</div>
                <div className="nav-item" onClick={() => navigate('/settings')}><i className="fa-solid fa-gear"></i> Ustawienia</div>
                <div className="sidebar-bottom">
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj</div>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-header">
                    <div className="page-title">Zagrożenia Wewnętrzne & Audyt Personelu</div>
                    <div className="page-subtitle">Panel antykorupcyjny do monitorowania pracowników banku i działań administracyjnych</div>
                </div>

                {/* KARTA GŁÓWNA - PODEJRZANY ADMIN */}
                {suspiciousPatternsCount > 0 && suspiciousAdmin && (
                    <div className="threat-alert-box">
                        <div className="threat-header">
                            <i className="fa-solid fa-shield-virus"></i> Wykryto podejrzane zachowanie administratora
                        </div>
                        <div className="threat-card">
                            <div className="admin-profile">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div className="admin-avatar"><i className="fa-regular fa-user"></i></div>
                                    <div>
                                        <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '16px' }}>Admin #{String(suspiciousAdmin.id).padStart(2, '0')} - {suspiciousAdmin.name}</div>
                                        <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '3px' }}>Wykryto odchylenia operacyjne</div>
                                    </div>
                                </div>
                                <div className="risk-badge">Wysokie Ryzyko</div>
                            </div>
                            
                            <div className="warning-text">
                                <i className="fa-solid fa-triangle-exclamation"></i> 
                                {/* UWAGA: Naprawiony tag &gt; !!! */}
                                Ręcznie odblokowano {suspiciousAdmin.resolvedCases} przelewów wysokiego ryzyka (Wynik &gt; 0.95).
                            </div>

                            <div className="threat-kpis">
                                <div className="threat-kpi-card">
                                    <div className="threat-kpi-label">Odblokowane Przelewy</div>
                                    <div className="threat-kpi-value">{suspiciousAdmin.resolvedCases}</div>
                                </div>
                                <div className="threat-kpi-card">
                                    <div className="threat-kpi-label">Rola w systemie</div>
                                    <div className="threat-kpi-value" style={{ color: '#1E293B', fontSize: '16px', marginTop: '4px' }}>{suspiciousAdmin.role}</div>
                                </div>
                                <div className="threat-kpi-card">
                                    <div className="threat-kpi-label">Email kontaktowy</div>
                                    <div className="threat-kpi-value" style={{ color: '#1E293B', fontSize: '16px', marginTop: '4px' }}>{suspiciousAdmin.email}</div>
                                </div>
                            </div>

                            <div className="threat-actions">
                                {/* PODPIĘTE PRZYCISKI Z GŁÓWNEJ KARTY */}
                                <button className="btn-suspend" onClick={() => handleSuspend(suspiciousAdmin.id, suspiciousAdmin.name)}>Zawieś Dostęp Administratora</button>
                                <button className="btn-audit" onClick={() => handleViewLog(suspiciousAdmin.id)}>Zobacz Pełny Log Audytowy</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* WYKRES */}
                <div className="stats-container">
                    <div className="stats-header">Ręczne zatwierdzenia (Overrides) przez Administratora</div>
                    <div className="stats-sub">Liczba zablokowanych przelewów ręcznie zwolnionych przez każdego analityka (Ostatnie 30 Dni)</div>
                    
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={admins}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="login" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                            <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="resolvedCases" radius={[4, 4, 0, 0]}>
                                {admins.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.id === suspiciousAdmin?.id && suspiciousPatternsCount > 0 ? '#DC2626' : '#1E3A8A'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    {suspiciousPatternsCount > 0 && suspiciousAdmin && (
                        <div style={{ color: '#DC2626', fontSize: '13px', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-circle-exclamation"></i> Administrator {suspiciousAdmin.login} wykazuje znacznie wyższą aktywność odblokowań w porównaniu do reszty zespołu.
                        </div>
                    )}
                </div>

                {/* KPI NA DOLE */}
                <div className="kpi-row">
                    <div className="kpi-box">
                        <div className="kpi-icon"><i className="fa-solid fa-chart-line"></i></div>
                        <div className="kpi-box-title">Suma Zatwierdzeń (30 Dni)</div>
                        <div className="kpi-box-val">{totalOverrides}</div>
                    </div>
                    <div className="kpi-box">
                        <div className="kpi-icon red"><i className="fa-solid fa-shield-virus"></i></div>
                        <div className="kpi-box-title">Wykryto Podejrzane Wzorce</div>
                        <div className="kpi-box-val red">{suspiciousPatternsCount}</div>
                    </div>
                    <div className="kpi-box" onClick={() => setShowAdminModal(true)}>
                        <div className="kpi-icon green"><i className="fa-regular fa-user"></i></div>
                        <div className="kpi-box-title">Aktywni Administratorzy</div>
                        <div className="kpi-box-val">{admins.length}</div>
                        <span className="kpi-link">Kliknij, aby zarządzać administratorami &rarr;</span>
                    </div>
                </div>
            </main>

            {/* MODAL 1: TABELA WSZYSTKICH ADMINÓW */}
            {showAdminModal && (
                <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <div>
                                <h2><i className="fa-regular fa-user"></i> Zarządzanie Administratorami</h2>
                                <p>Zarządzaj analitykami systemu i ich uprawnieniami dostępu</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowAdminModal(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        <div className="modal-body">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID Admina</th>
                                        <th>Imię i Nazwisko / Email</th>
                                        <th>Rola w systemie</th>
                                        <th>Zatwierdzenia</th>
                                        <th>Status</th>
                                        <th>Akcje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map(admin => (
                                        <tr key={admin.id}>
                                            <td style={{ fontWeight: '600', color: '#1E3A8A' }}>
                                                {admin.id === suspiciousAdmin?.id && suspiciousPatternsCount > 0 && <i className="fa-solid fa-circle-exclamation" style={{color: '#DC2626', marginRight: '8px'}}></i>}
                                                Admin #{String(admin.id).padStart(2, '0')}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '600', color: '#1E293B' }}>{admin.name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748B' }}>{admin.email}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{admin.role}</div>
                                            </td>
                                            <td>
                                                <span style={{ 
                                                    background: admin.id === suspiciousAdmin?.id && suspiciousPatternsCount > 0 ? '#FEE2E2' : '#F1F5F9', 
                                                    color: admin.id === suspiciousAdmin?.id && suspiciousPatternsCount > 0 ? '#DC2626' : '#475569', 
                                                    padding: '4px 8px', borderRadius: '4px', fontWeight: '600'
                                                }}>
                                                    {admin.resolvedCases}
                                                </span>
                                            </td>
                                            <td><span className="status-pill">Aktywny</span></td>
                                            <td>
                                                {/* PODPIĘTE PRZYCISKI Z TABELI */}
                                                <button className="action-btn-view" onClick={() => handleViewLog(admin.id)}>Zobacz Log</button>
                                                <button className="action-btn-suspend" onClick={() => handleSuspend(admin.id, admin.name)}>Zawieś</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-footer">
                            <div className="footer-warn">
                                <i className="fa-solid fa-circle-exclamation"></i> Administratorzy z podejrzaną aktywnością są podświetleni na czerwono
                            </div>
                            <button className="btn-close-modal" onClick={() => setShowAdminModal(false)}>Zamknij</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: NOWY - PEŁNY LOG AUDYTOWY KONKRETNEGO ADMINA */}
            {isAuditModalOpen && auditLogData && (
                <div className="modal-overlay" onClick={() => setIsAuditModalOpen(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <div>
                                <h2><i className="fa-solid fa-list-check"></i> Pełny Log Audytowy: {auditLogData.admin_name}</h2>
                                <p>Rola: {auditLogData.role}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsAuditModalOpen(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        <div className="modal-body">
                            {/* Statystyki z API od Kolegi */}
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                                <div className="threat-kpi-card" style={{margin: 0}}>
                                    <div className="threat-kpi-label">Wszystkie Akcje</div>
                                    <div className="threat-kpi-value" style={{color: '#1E3A8A'}}>{auditLogData.stats.total_actions}</div>
                                </div>
                                <div className="threat-kpi-card" style={{margin: 0}}>
                                    <div className="threat-kpi-label">Konta Zablokowane</div>
                                    <div className="threat-kpi-value" style={{color: '#16A34A'}}>{auditLogData.stats.transfers_blocked}</div>
                                </div>
                                <div className="threat-kpi-card" style={{margin: 0}}>
                                    <div className="threat-kpi-label">Przelewy Odblokowane</div>
                                    <div className="threat-kpi-value">{auditLogData.stats.transfers_unlocked}</div>
                                </div>
                                <div className="threat-kpi-card" style={{margin: 0}}>
                                    <div className="threat-kpi-label">Śr. Ryzyko ML</div>
                                    <div className="threat-kpi-value" style={{color: '#475569'}}>{auditLogData.stats.avg_ml_score}</div>
                                </div>
                            </div>

                            {/* Tabela historii akcji */}
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Czas Operacji</th>
                                        <th>ID Transakcji</th>
                                        <th>Wykonana Akcja</th>
                                        <th>Wynik ML</th>
                                        <th>Kwota</th>
                                        <th>Uzasadnienie (Notatka)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogData.history.length === 0 ? (
                                        <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Brak zarejestrowanych akcji dla tego administratora.</td></tr>
                                    ) : auditLogData.history.map((h, idx) => (
                                        <tr key={idx}>
                                            <td style={{color: '#64748B'}}>{h.timestamp}</td>
                                            <td style={{fontWeight: 'bold', color: '#1E3A8A'}}>{h.tx_id ? `#${h.tx_id}` : 'Brak'}</td>
                                            <td>
                                                <span className="status-pill" style={{
                                                    background: h.action === 'MANUAL_APPROVE' ? '#FEE2E2' : '#E0E7FF', 
                                                    color: h.action === 'MANUAL_APPROVE' ? '#DC2626' : '#3730A3'
                                                }}>
                                                    {h.action}
                                                </span>
                                            </td>
                                            <td style={{
                                                color: h.ml_score >= 0.95 ? '#DC2626' : 'inherit', 
                                                fontWeight: h.ml_score >= 0.95 ? 'bold' : 'normal'
                                            }}>{h.ml_score}</td>
                                            <td style={{fontWeight: '500'}}>{h.amount > 0 ? `${h.amount} PLN` : '-'}</td>
                                            <td style={{fontSize: '12px', fontStyle: 'italic', maxWidth: '250px', color: '#475569'}}>{h.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-close-modal" onClick={() => setIsAuditModalOpen(false)}>Zamknij Rejestr</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}