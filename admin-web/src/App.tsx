import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProductSelection from './pages/ProductSelection';
import Dashboard from './pages/Dashboard';
import AnalysisDashboard from './pages/AnalysisDashboard';
import Upload from './pages/Upload';
import Races from './pages/Races';
import ArchiveImport from './pages/ArchiveImport';
import Announcements from './pages/Announcements';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import BetaAccess from './pages/BetaAccess';
import ProtectedRoute from './components/ProtectedRoute';
import ProductRequiredRoute from './components/ProductRequiredRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductSelection />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <ProductRequiredRoute>
              <Layout />
            </ProductRequiredRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/archive-import" element={<ArchiveImport />} />
        <Route path="/races" element={<Races />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/beta-access" element={<BetaAccess />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analysis" element={<Navigate to="/analysis/dashboard" replace />} />
        <Route path="/analysis/dashboard" element={<AnalysisDashboard />} />
        <Route path="/analysis/upload" element={<Upload />} />
        <Route path="/analysis/archive-import" element={<ArchiveImport />} />
        <Route path="/analysis/races" element={<Races />} />
        <Route path="/analysis/logs" element={<Logs />} />
        <Route path="/analysis/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
