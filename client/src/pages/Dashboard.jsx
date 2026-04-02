import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { logout } from '../api/client.js';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

     
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
          Standup Tracker
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={user?.avatar_url} alt={user?.username}
            style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          <span style={{ fontSize: '13px', color: '#4a5568' }}>{user?.username}</span>
          <button onClick={handleLogout}
            style={{ fontSize: '13px', color: '#718096', background: 'none', border: 'none', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

     
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        <div
          onClick={() => navigate('/standup')}
          style={{
            background: '#3182CE',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>📝</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            Today's standup
          </div>
          <div style={{ fontSize: '13px', opacity: 0.85 }}>
            Generate from GitHub activity
          </div>
        </div>

        <div
          style={{
            background: '#F7FAFC',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
            Focus timer
          </div>
          <div style={{ fontSize: '13px', color: '#718096' }}>
            Coming in Phase 4
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;