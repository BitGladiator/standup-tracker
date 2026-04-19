import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Standup from './pages/Standup.jsx';
import Focus from './pages/Focus.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import Heatmap from './pages/Heatmap.jsx';
import Journal from './pages/Journal.jsx';
import ScoreTrend from './pages/ScoreTrend.jsx';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/standup" element={<ProtectedRoute><Standup /></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/heatmap" element={<ProtectedRoute><Heatmap /></ProtectedRoute>} />
      <Route path="/score-trend" element={<ProtectedRoute><ScoreTrend /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;