import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import AmlAlerts from './AmlAlerts'; 
import Settings from './Settings';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<AmlAlerts />} /> 
        <Route path="/settings" element={<Settings />} />
        <Route path="" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;