import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import AmlAlerts from './AmlAlerts'; 
import Settings from './Settings';
import TransactionStatistics from './TransactionStatistics'; 
import ClientPortal from './ClientPortal';
import AllTransactions from './AllTransactions';
import AccountFreezing from './AccountFreezing';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<AmlAlerts />} /> 
        <Route path="/statistics" element={<TransactionStatistics />} /> 
        <Route path="/settings" element={<Settings />} />
        <Route path="" element={<Navigate to="/" />} />
        <Route path="/klient" element={<ClientPortal />} />
              <Route path="/transactions" element={<AllTransactions />} />
              <Route path="/blacklist" element={<AccountFreezing />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;