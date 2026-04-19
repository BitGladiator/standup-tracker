import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { getHeatmap } from '../api/client.js';
import ContributionHeatmap from '../components/ContributionHeatmap.jsx';

const Heatmap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHeatmap()
      .then(setData)
      .catch((err) => setError(err.error || 'Failed to load heatmap'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '8px' }}
        >
          ← Back to dashboard
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
              Contribution heatmap
            </h1>
            <p style={{ fontSize: '13px', color: '#718096', margin: '4px 0 0' }}>
              {user?.username}'s coding activity — last 365 days
            </p>
          </div>
          <img
            src={user?.avatar_url}
            alt={user?.username}
            style={{ width: '36px', height: '36px', borderRadius: '50%' }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0', fontSize: '14px' }}>
          Loading your activity...
        </div>
      )}

      {error && (
        <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '14px', color: '#C53030', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {data && <ContributionHeatmap data={data} />}

    </div>
  );
};

export default Heatmap;