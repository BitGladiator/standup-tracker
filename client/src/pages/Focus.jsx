import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePomodoro from '../hooks/usePomodoro.js';
import useAudioEngine from '../hooks/useAudioEngine.js';
import AudioPlayer from '../components/AudioPlayer.jsx';
import { getTodaySessions } from '../api/client.js';

const Focus = () => {
  const navigate = useNavigate();
  const {
    phase,
    timeDisplay,
    progress,
    pomodoroCount,
    label,
    setLabel,
    sessions,
    setSessions,
    saving,
    start,
    pause,
    reset,
    skipBreak,
  } = usePomodoro();

  
  const audioEngine = useAudioEngine(phase);

  useEffect(() => {
    getTodaySessions()
      .then(setSessions)
      .catch(console.error);
  }, []);

  const isWorking = phase === 'work';
  const isBreak = phase === 'break';
  const isIdle = phase === 'idle';
  const isPaused = phase === 'paused';

  const phaseColor = isWorking ? '#3182CE' : isBreak ? '#38A169' : '#718096';
  const phaseLabel = isWorking
    ? 'Focus time'
    : isBreak
    ? 'Take a break'
    : isPaused
    ? 'Paused'
    : 'Ready to focus?';

  const totalMinutesToday = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>

      <div style={{ marginBottom: '40px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '8px' }}
        >
          ← Back to dashboard
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
          Focus timer
        </h1>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are you working on?"
          disabled={isWorking || isBreak}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '14px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            outline: 'none',
            boxSizing: 'border-box',
            color: '#1a202c',
            background: isWorking || isBreak ? '#f7fafc' : '#fff',
            cursor: isWorking || isBreak ? 'not-allowed' : 'text',
          }}
        />
      </div>

     
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ position: 'relative', width: '220px', height: '220px' }}>
          <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="110" cy="110" r={radius}
              fill="none"
              stroke={phaseColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', fontWeight: '600', color: '#1a202c', fontVariantNumeric: 'tabular-nums' }}>
              {timeDisplay}
            </div>
            <div style={{ fontSize: '12px', color: phaseColor, fontWeight: '500', marginTop: '4px' }}>
              {phaseLabel}
            </div>
          </div>
        </div>

        {pomodoroCount > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
            {Array.from({ length: pomodoroCount }).map((_, i) => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3182CE' }} />
            ))}
          </div>
        )}
      </div>

   
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
        {(isIdle || isPaused) && (
          <button
            onClick={start}
            style={{ padding: '12px 32px', fontSize: '15px', fontWeight: '600', background: '#3182CE', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {isPaused ? 'Resume' : 'Start focus'}
          </button>
        )}

        {isWorking && (
          <button
            onClick={pause}
            style={{ padding: '12px 32px', fontSize: '15px', fontWeight: '600', background: '#fff', color: '#1a202c', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
          >
            Pause
          </button>
        )}

        {isBreak && (
          <button
            onClick={skipBreak}
            style={{ padding: '12px 32px', fontSize: '15px', fontWeight: '600', background: '#38A169', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Skip break
          </button>
        )}

        {(isWorking || isBreak || isPaused) && (
          <button
            onClick={reset}
            style={{ padding: '12px 20px', fontSize: '15px', fontWeight: '600', background: '#fff', color: '#718096', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
          >
            Reset
          </button>
        )}
      </div>

     
      <AudioPlayer phase={phase} audioEngine={audioEngine} />

   
      {sessions.length > 0 && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '28px', marginTop: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', margin: 0 }}>
              Today's sessions
            </h3>
            <span style={{ fontSize: '13px', color: '#718096' }}>
              {totalMinutesToday} min total
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F7FAFC', borderRadius: '8px', fontSize: '13px' }}
              >
                <span style={{ color: '#2d3748', fontWeight: '500' }}>{session.label}</span>
                <span style={{ color: '#718096' }}>{session.duration_minutes} min</span>
              </div>
            ))}
          </div>

          {saving && (
            <p style={{ fontSize: '12px', color: '#718096', marginTop: '8px', textAlign: 'center' }}>
              Saving session...
            </p>
          )}
        </div>
      )}

    </div>
  );
};

export default Focus;