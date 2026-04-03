import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { logout, getSessionStats } from '../api/client.js';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getSessionStats()
      .then(setStats)
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/login');
  };

  // Build last 7 days for bar chart
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = stats?.daily?.find((r) => r.date?.startsWith(dateStr));
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: found ? parseInt(found.total_minutes) : 0,
      });
    }
    return days;
  };

  const days = getLast7Days();
  const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);

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

     
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div
          onClick={() => navigate('/standup')}
          style={{ background: '#3182CE', borderRadius: '12px', padding: '24px', cursor: 'pointer', color: '#fff' }}
        >
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>📝</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Today's standup</div>
          <div style={{ fontSize: '13px', opacity: 0.85 }}>Generate from GitHub activity</div>
        </div>

        <div
          onClick={() => navigate('/focus')}
          style={{ background: '#276749', borderRadius: '12px', padding: '24px', cursor: 'pointer', color: '#fff' }}
        >
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Focus timer</div>
          <div style={{ fontSize: '13px', opacity: 0.85 }}>Pomodoro — 25 min sessions</div>
        </div>
      </div>

    
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          <StatCard
            label="Total focus time"
            value={`${Math.round((stats.totals?.total_minutes || 0) / 60 * 10) / 10}h`}
          />
          <StatCard
            label="Sessions completed"
            value={stats.totals?.total_sessions || 0}
          />
          <StatCard
            label="Day streak"
            value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}
          />
        </div>
      )}

     
      <div style={{ background: '#F7FAFC', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', margin: '0 0 16px' }}>
          Focus time this week
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
          {days.map((day, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
              <div
                title={`${day.minutes} min`}
                style={{
                  width: '100%',
                  height: `${Math.max((day.minutes / maxMinutes) * 60, day.minutes > 0 ? 4 : 0)}px`,
                  background: day.minutes > 0 ? '#3182CE' : '#e2e8f0',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease',
                }}
              />
              <span style={{ fontSize: '11px', color: '#a0aec0' }}>{day.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div style={{ background: '#F7FAFC', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
    <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#718096' }}>{label}</div>
  </div>
);

export default Dashboard;