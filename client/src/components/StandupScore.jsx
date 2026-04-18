import { useEffect, useState } from 'react';

const gradeColors = {
  A: { bg: '#F0FFF4', border: '#9AE6B4', text: '#276749' },
  B: { bg: '#EBF8FF', border: '#90CDF4', text: '#2B6CB0' },
  C: { bg: '#FEFCBF', border: '#F6E05E', text: '#744210' },
  D: { bg: '#FFF5F5', border: '#FEB2B2', text: '#9B2335' },
};

const DimensionBar = ({ label, score, max, feedback }) => {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? '#48BB78' : pct >= 60 ? '#ECC94B' : '#FC8181';

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#4a5568' }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#718096' }}>{score}/{max}</span>
      </div>
      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '99px',
          transition: 'width 0.8s ease',
        }} />
      </div>
      {feedback && (
        <p style={{ fontSize: '11px', color: '#a0aec0', margin: '4px 0 0', lineHeight: 1.4 }}>
          {feedback}
        </p>
      )}
    </div>
  );
};

const StandupScore = ({ score, loading }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (score) setTimeout(() => setVisible(true), 100);
  }, [score]);

  if (loading) {
    return (
      <div style={{
        background: '#F7FAFC',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '13px', color: '#a0aec0' }}>
          Analysing your standup
          <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>...</span>
        </div>
      </div>
    );
  }

  if (!score) return null;

  const colors = gradeColors[score.grade] || gradeColors.C;

  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      background: colors.bg,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>
            Standup score
          </div>
          <div style={{ fontSize: '11px', color: '#718096' }}>
            Powered by Groq + Llama 3.1
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: colors.text, lineHeight: 1 }}>
            {score.overall_score}
          </div>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            background: colors.border,
            color: colors.text,
            padding: '1px 10px',
            borderRadius: '99px',
            marginTop: '4px',
          }}>
            Grade {score.grade}
          </div>
        </div>
      </div>

     
      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
        <DimensionBar label="Clarity" score={score.clarity_score} max={25} feedback={score.clarity_feedback} />
        <DimensionBar label="Specificity" score={score.specificity_score} max={25} feedback={score.specificity_feedback} />
        <DimensionBar label="Blocker quality" score={score.blocker_quality_score} max={25} feedback={score.blocker_feedback} />
        <DimensionBar label="Completeness" score={score.completeness_score} max={25} feedback={score.completeness_feedback} />
      </div>

   
      <div style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.6, fontStyle: 'italic' }}>
        "{score.overall_feedback}"
      </div>

    </div>
  );
};

export default StandupScore;