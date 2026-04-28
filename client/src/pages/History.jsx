import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStandupHistory } from '../api/client.js';

const History = () => {
  const navigate = useNavigate();
  const [standups, setStandups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getStandupHistory()
      .then(setStandups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr?.startsWith(today);
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#718096' }}>Loading history...</div>;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

      <button
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '8px' }}
      >
        ← Back to dashboard
      </button>
      <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a202c', margin: '0 0 32px' }}>
        Standup history
      </h1>

      {standups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a0aec0', fontSize: '14px' }}>
          No standups saved yet. Go write your first one!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {standups.map((standup) => (
            <div
              key={standup.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
             
              <div
                onClick={() => setExpanded(expanded === standup.id ? null : standup.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  background: expanded === standup.id ? '#F7FAFC' : '#fff',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a202c' }}>
                    {formatDate(standup.date)}
                  </span>
                  {isToday(standup.date) && (
                    <span style={{ fontSize: '11px', background: '#EBF8FF', color: '#2B6CB0', padding: '1px 8px', borderRadius: '99px', fontWeight: '500' }}>
                      Today
                    </span>
                  )}
                  {standup.auto_generated && (
                    <span style={{ fontSize: '11px', background: '#F0FFF4', color: '#276749', padding: '1px 8px', borderRadius: '99px', fontWeight: '500' }}>
                      Auto-generated
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {standup.overall_score != null && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '2px 10px',
                      borderRadius: '99px',
                      background: standup.grade === 'A' ? '#F0FFF4' : standup.grade === 'B' ? '#EBF8FF' : standup.grade === 'C' ? '#FEFCBF' : '#FFF5F5',
                      color: standup.grade === 'A' ? '#276749' : standup.grade === 'B' ? '#2B6CB0' : standup.grade === 'C' ? '#744210' : '#9B2335',
                    }}>
                      {standup.overall_score}/100 · {standup.grade}
                    </span>
                  )}
                  <span style={{ color: '#a0aec0', fontSize: '12px' }}>
                    {expanded === standup.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expanded === standup.id && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid #e2e8f0' }}>
                  <Section title="Yesterday" content={standup.yesterday} />
                  <Section title="Today" content={standup.today} />
                  <Section title="Blockers" content={standup.blockers} />
                  {standup.overall_feedback && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#F7FAFC', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        AI Feedback
                      </div>
                      <p style={{ fontSize: '13px', color: '#4a5568', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                        "{standup.overall_feedback}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

const Section = ({ title, content }) => (
  <div style={{ marginTop: '16px' }}>
    <div style={{ fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
      {title}
    </div>
    <div style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
      {content || <span style={{ color: '#a0aec0' }}>Nothing logged</span>}
    </div>
  </div>
);

export default History;