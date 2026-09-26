import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Races from './pages/Races';
import ArchiveImport from './pages/ArchiveImport';
import Announcements from './pages/Announcements';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import BetaAccess from './pages/BetaAccess';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/products" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/archive-import" element={<ArchiveImport />} />
        <Route path="/races" element={<Races />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/beta-access" element={<BetaAccess />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analysis" element={<Navigate to="/dashboard" replace />} />
        <Route path="/analysis/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/analysis/upload" element={<Navigate to="/upload" replace />} />
        <Route path="/analysis/archive-import" element={<Navigate to="/archive-import" replace />} />
        <Route path="/analysis/races" element={<Navigate to="/races" replace />} />
        <Route path="/analysis/announcements" element={<Navigate to="/announcements" replace />} />
        <Route path="/analysis/beta-access" element={<Navigate to="/beta-access" replace />} />
        <Route path="/analysis/logs" element={<Navigate to="/logs" replace />} />
        <Route path="/analysis/settings" element={<Navigate to="/settings" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
