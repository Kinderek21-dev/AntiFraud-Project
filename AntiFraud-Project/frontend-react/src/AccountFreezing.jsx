import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccountFreezing() {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [riskFilter, setRiskFilter] = useState('All');

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Błąd pobierania użytkowników:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleBlock = async (userId, currentStatus) => {
        const isBlocked = currentStatus === 'Zablokowane' || currentStatus === 'Frozen';
        const actionText = isBlocked ? 'ODBLOKOWAĆ' : 'ZAMROZIĆ';

        if (!window.confirm(`Czy na pewno chcesz ${actionText} to konto?`)) return;

        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${userId}/toggle-block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_id: 1 })
            });

            if (res.ok) {
                fetchUsers();
            } else {
                alert("Wystąpił błąd podczas zmiany statusu.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getRiskLevel = (user) => {
        if (user.risk === 'Critical') return 'Krytyczne';
        if (user.risk === 'High') return 'Wysokie';
        if (user.risk === 'Medium') return 'Średnie';
        if (user.risk === 'Low') return 'Niskie';

        const count = Number(user.blockedCount || user.blocked_count) || 0;
        if (count >= 15) return 'Krytyczne';
        if (count >= 5) return 'Wysokie';
        if (count >= 1) return 'Średnie';
        return 'Niskie';
    };

    const getStatus = (user) => {
        return (user.status === 'Zablokowane' || user.status === 'Frozen') ? 'Zablokowane' : 'Aktywne';
    };

    const getRiskStyle = (risk) => {
        if (risk === 'Krytyczne') return { background: '#FEE2E2', color: '#EF4444' };
        if (risk === 'Wysokie') return { background: '#FFEDD5', color: '#F97316' };
        if (risk === 'Średnie') return { background: '#FEF3C7', color: '#D97706' };
        return { background: '#F1F5F9', color: '#64748B' }; 
    };

    const getStatusStyle = (status) => {
        if (status === 'Zablokowane') return { background: '#FEE2E2', color: '#EF4444' };
        return { background: '#DCFCE7', color: '#16A34A' }; 
    };

    const filteredUsers = users.filter(u => {
        const uRisk = getRiskLevel(u);
        const uStatus = getStatus(u);
        const uAccId = u.accId || `ACC-${String(u.id).padStart(4, '0')}`;

        const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || uAccId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' ? true : uStatus === statusFilter;
        const matchRisk = riskFilter === 'All' ? true : uRisk === riskFilter;

        return matchSearch && matchStatus && matchRisk;
    });

    const frozenCount = users.filter(u => getStatus(u) === 'Zablokowane').length;

    const styles = `
        .dashboard-body { display: flex; height: 100vh; background-color: #F8FAFC; color: #1E293B; width: 100vw; overflow: hidden; font-family: 'Inter', sans-serif;}
        .sidebar { width: 260px; background-color: #243B8B; color: white; display: flex; flex-direction: column; padding: 30px 20px; flex-shrink: 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; }
        .nav-item { padding: 15px; margin-bottom: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px; color: #A3B1CC; transition: 0.3s; font-weight: 500;}
        .nav-item:hover { background-color: rgba(255,255,255,0.1); color: white; }
        .nav-item.active { background-color: #3b5cb8; color: white; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.1);}
        .main-content { flex: 1; display: flex; flex-direction: column; padding: 40px; overflow: hidden; } 
        
        .page-header h1 { font-size: 26px; font-weight: 700; color: #1E293B; margin-bottom: 8px;}
        .page-header p { font-size: 14px; color: #64748B; margin-bottom: 25px;}
        
        .controls-bar { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; gap: 15px; align-items: center; border: 1px solid #E2E8F0;}
        .search-input { display: flex; align-items: center; background: white; border: 1px solid #CBD5E1; padding: 10px 15px; border-radius: 8px; flex: 1; min-width: 300px;}
        .search-input input { border: none; background: transparent; outline: none; margin-left: 10px; width: 100%; color: #334155; font-size: 14px; }
        
        .filter-select { padding: 10px 15px; border: 1px solid #CBD5E1; border-radius: 8px; outline: none; font-size: 14px; color: #334155; background: white; font-weight: 500;}
        .btn-outline { padding: 10px 20px; border: 1px solid #CBD5E1; background: white; border-radius: 8px; font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; display: flex; gap: 8px; align-items: center;}
        .btn-primary { padding: 10px 20px; background: #243B8B; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; display: flex; gap: 8px; align-items: center;}
        
        .table-container { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow-y: auto; max-height: calc(100vh - 300px); border: 1px solid #E2E8F0; display: flex; flex-direction: column;}
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { position: sticky; top: 0; background: white; text-align: left; padding: 18px 24px; color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; z-index: 10;}
        .data-table td { padding: 18px 24px; border-bottom: 1px solid #E2E8F0; color: #334155; font-size: 14px; font-weight: 500; }
        
        .btn-freeze { padding: 8px 20px; border-radius: 6px; border: 1px solid #EF4444; color: #EF4444; background: transparent; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; width: 110px; text-align: center;}
        .btn-freeze:hover { background: #FEE2E2; }
        .btn-unfreeze { padding: 8px 20px; border-radius: 6px; border: 1px solid #10B981; color: #10B981; background: transparent; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; width: 110px; text-align: center; background: #ECFDF5;}
        .btn-unfreeze:hover { background: #DCFCE7; }
        
        .table-footer { padding: 15px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; font-size: 14px; color: #64748B;}
    `;

    return (
        <div className="dashboard-body">
            <style>{styles}</style>

            <aside className="sidebar">
                <div className="logo"><i className="fa-solid fa-shield-halved"></i> AntiFraud</div>
                <div className="nav-item" onClick={() => navigate('/dashboard')}><i className="fa-solid fa-border-all"></i> Dashboard</div>
                <div className="nav-item" onClick={() => navigate('/alerts')}><i className="fa-solid fa-triangle-exclamation"></i> Alerty AML</div>
                <div className="nav-item" onClick={() => navigate('/transactions')}><i className="fa-solid fa-book-journal-whills"></i> Rejestr Transakcji</div>

                <div className="nav-item active"><i className="fa-solid fa-user-lock"></i> Zablokowani</div>

                <div className="nav-item" onClick={() => navigate('/statistics')}><i className="fa-solid fa-chart-simple"></i> Statystyki</div>
                <div className="nav-item" onClick={() => navigate('/settings')}><i className="fa-solid fa-gear"></i> Ustawienia</div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <div className="nav-item"><i className="fa-regular fa-user"></i> Administrator</div>
                    <div className="nav-item" onClick={() => navigate('/')}><i className="fa-solid fa-arrow-right-from-bracket"></i> Wyloguj</div>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-header">
                    <h1>Czarna Lista / Zamrażanie Kont</h1>
                    <p>Zarządzaj kontami zablokowanymi z powodu naruszeń AML. Zmień status konta, aby je zamrozić lub odblokować.</p>
                </div>

                <div className="controls-bar">
                    <div className="search-input">
                        <i className="fa-solid fa-magnifying-glass" style={{ color: '#94A3B8' }}></i>
                        <input type="text" placeholder="Szukaj po ID, Imieniu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>Status:</span>
                        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="All">Wszystkie</option>
                            <option value="Zablokowane">Zamrożone</option>
                            <option value="Aktywne">Aktywne</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>Ryzyko:</span>
                        <select className="filter-select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                            <option value="All">Wszystkie</option>
                            <option value="Krytyczne">Krytyczne</option>
                            <option value="Wysokie">Wysokie</option>
                            <option value="Średnie">Średnie</option>
                            <option value="Niskie">Niskie</option>
                        </select>
                    </div>

                    <button className="btn-outline"><i className="fa-solid fa-filter"></i> Filtry</button>
                    <button className="btn-primary"><i className="fa-solid fa-download"></i> Eksport CSV</button>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID Użytkownika</th>
                                <th>Nazwa Konta</th>
                                <th>Zablokowane Przelewy</th>
                                <th>Poziom Ryzyka ML</th>
                                <th>Status Konta</th>
                                <th>Akcja</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Brak użytkowników do wyświetlenia.</td></tr>
                            ) : filteredUsers.map(user => {
                                const uRisk = getRiskLevel(user);
                                const uStatus = getStatus(user);
                                const uAccId = user.accId || `ACC-${String(user.id).padStart(4, '0')}`;

                                const riskStyle = getRiskStyle(uRisk);
                                const statusStyle = getStatusStyle(uStatus);

                                return (
                                    <tr key={user.id}>
                                        <td style={{ color: '#243B8B', fontWeight: '700' }}>{uAccId}</td>
                                        <td>{user.name}</td>
                                        <td style={{ fontWeight: '700' }}>{user.blockedCount || user.blocked_count || 0}</td>
                                        <td>
                                            <span style={{ padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', ...riskStyle }}>
                                                {uRisk}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', ...statusStyle }}>
                                                {uStatus === 'Zablokowane' ? 'Zamrożone' : 'Aktywne'}
                                            </span>
                                        </td>
                                        <td>
                                            {uStatus === 'Aktywne' ? (
                                                <button className="btn-freeze" onClick={() => handleToggleBlock(user.id, uStatus)}>Zamroź</button>
                                            ) : (
                                                <button className="btn-unfreeze" onClick={() => handleToggleBlock(user.id, uStatus)}>Odblokuj</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="table-footer">
                        <span>Pokazano {filteredUsers.length} z {users.length} kont</span>
                        <span style={{ color: '#EF4444', fontWeight: '600' }}>{frozenCount} kont jest obecnie zamrożonych</span>
                    </div>
                </div>
            </main>
        </div>
    );
}