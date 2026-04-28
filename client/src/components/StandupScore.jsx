import { useState, useEffect } from 'react';

const StandupScore = ({ score, loading }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (score) {
      setVisible(false);
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [score]);

  if (loading) {
    return (
      <div style={{ background: '#F7FAFC', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginTop: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '8px' }}>
          Analysing your standup across 5 agents...
        </div>
        <div style={{ fontSize: '11px', color: '#cbd5e0' }}>
          Clarity · Specificity · Blockers · Completeness · Critic review
        </div>
      </div>
    );
  }

  if (!score) return null;

  const gradeColors = {
    A: { bg: '#F0FFF4', border: '#9AE6B4', text: '#276749' },
    B: { bg: '#EBF8FF', border: '#90CDF4', text: '#2B6CB0' },
    C: { bg: '#FEFCBF', border: '#F6E05E', text: '#744210' },
    D: { bg: '#FFF5F5', border: '#FEB2B2', text: '#9B2335' },
  };

  const colors = gradeColors[score.grade] || gradeColors.C;

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', marginTop: '24px', background: colors.bg, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>
            Multi-agent standup score
          </div>
          <div style={{ fontSize: '11px', color: '#718096' }}>
            5 agents · {score.pipeline_meta?.total_tokens || 0} tokens · {score.pipeline_meta?.duration_ms || 0}ms
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: colors.text, lineHeight: 1 }}>
            {score.overall_score}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', background: colors.border, color: colors.text, padding: '1px 10px', borderRadius: '99px', marginTop: '4px' }}>
            Grade {score.grade}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        {[
          { label: 'Clarity',        score: score.clarity_score,         feedback: score.clarity_feedback },
          { label: 'Specificity',    score: score.specificity_score,     feedback: score.specificity_feedback },
          { label: 'Blocker quality',score: score.blocker_quality_score, feedback: score.blocker_feedback },
          { label: 'Completeness',   score: score.completeness_score,    feedback: score.completeness_feedback },
        ].map(({ label, score: s, feedback }) => {
          const pct = (s / 25) * 100;
          const color = pct >= 80 ? '#48BB78' : pct >= 60 ? '#ECC94B' : '#FC8181';
          return (
            <div key={label} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#4a5568' }}>{label}</span>
                <span style={{ fontSize: '12px', color: '#718096' }}>{s}/25</span>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
              </div>
              {feedback && (
                <p style={{ fontSize: '11px', color: '#a0aec0', margin: '4px 0 0', lineHeight: 1.4 }}>{feedback}</p>
              )}
            </div>
          );
        })}
      </div>

    
      <p style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '14px' }}>
        "{score.overall_feedback}"
      </p>

  
      {(score.strengths?.length > 0 || score.improvements?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          {score.strengths?.length > 0 && (
            <div style={{ background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#276749', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Strengths
              </div>
              {score.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#2d3748', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#48BB78', flexShrink: 0 }}>+</span>{s}
                </div>
              ))}
            </div>
          )}
          {score.improvements?.length > 0 && (
            <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#9B2335', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Improve
              </div>
              {score.improvements.map((imp, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#2d3748', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#FC8181', flexShrink: 0 }}>→</span>{imp}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowReasoning((r) => !r)}
        style={{ fontSize: '12px', color: colors.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
      >
        {showReasoning ? 'Hide' : 'Show'} agent reasoning
      </button>

      {showReasoning && score.agent_reasoning && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['clarity', 'specificity', 'blocker_quality', 'completeness'].map((dim) => (
            score.agent_reasoning[dim] && (
              <div key={dim} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  {dim.replace('_', ' ')} agent
                </div>
                <div style={{ fontSize: '12px', color: '#4a5568', lineHeight: 1.5 }}>
                  {score.agent_reasoning[dim]}
                </div>
              </div>
            )
          ))}
          {score.agent_reasoning.critic_adjustments?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Critic adjustments
              </div>
              {score.agent_reasoning.critic_adjustments
                .filter((a) => a.reason)
                .map((adj, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '500' }}>{adj.dimension.replace('_', ' ')}:</span>{' '}
                    {adj.original_score} → {adj.adjusted_score} — {adj.reason}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default StandupScore;