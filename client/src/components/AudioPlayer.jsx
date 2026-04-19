import { useRef, useEffect } from 'react';

const BAR_COUNT = 32;

const Visualizer = ({ analyserData, playing, phase }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const barW = W / BAR_COUNT - 1;
    const color = phase === 'work' ? '#3182CE' : '#38A169';

    for (let i = 0; i < BAR_COUNT; i++) {
      const dataIndex = Math.floor((i / BAR_COUNT) * analyserData.length);
      const value = analyserData[dataIndex] || 0;
      const barH = playing
        ? Math.max(2, (value / 255) * H * 0.9)
        : 2;
      const x = i * (barW + 1);
      const y = H - barH;

      ctx.fillStyle = playing ? color : '#e2e8f0';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barW, barH, 2);
      } else {
        ctx.rect(x, y, barW, barH);
      }
      ctx.fill();
    }
  }, [analyserData, playing, phase]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={48}
      style={{ width: '100%', height: '48px', display: 'block' }}
    />
  );
};

const AudioPlayer = ({ phase, audioEngine }) => {
  const {
    playing,
    loading,
    volume,
    setVolume,
    muted,
    toggleMute,
    vibe,
    changeVibe,
    analyserData,
    vibes,
    start,
    stop,
  } = audioEngine;

  const isActive = phase === 'work' || phase === 'break';
  const phaseColor = phase === 'work'
    ? '#3182CE'
    : phase === 'break'
    ? '#38A169'
    : '#718096';

  const phaseLabel = phase === 'work'
    ? 'Focus sounds'
    : phase === 'break'
    ? 'Break sounds'
    : 'Start timer to enable';

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px',
      background: '#F7FAFC',
      marginTop: '24px',
    }}>


      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#2d3748' }}>
            Focus sounds
          </div>
          <div style={{ fontSize: '11px', color: phaseColor, marginTop: '2px' }}>
            {phaseLabel}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: 'pointer',
              color: muted ? '#a0aec0' : '#4a5568',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            )}
          </button>

        
          <button
            onClick={playing ? stop : start}
            disabled={(!isActive && !playing) || loading}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '500',
              background: playing ? '#fff' : phaseColor,
              color: playing ? '#4a5568' : '#fff',
              border: `1px solid ${playing ? '#e2e8f0' : phaseColor}`,
              borderRadius: '6px',
              cursor: ((!isActive && !playing) || loading) ? 'not-allowed' : 'pointer',
              opacity: ((!isActive && !playing) || loading) ? 0.5 : 1,
              minWidth: '60px',
            }}
          >
            {loading ? '...' : playing ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>

   
      <div style={{
        marginBottom: '12px',
        background: '#fff',
        borderRadius: '8px',
        padding: '8px',
        border: '1px solid #e2e8f0',
      }}>
        <Visualizer analyserData={analyserData} playing={playing} phase={phase} />
      </div>

    
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            if (muted) toggleMute();
          }}
          style={{ flex: 1, accentColor: phaseColor, cursor: 'pointer' }}
        />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      </div>

      
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {Object.entries(vibes).map(([key, config]) => (
          <button
            key={key}
            onClick={() => changeVibe(key)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '500',
              borderRadius: '99px',
              border: `1px solid ${vibe === key ? phaseColor : '#e2e8f0'}`,
              background: vibe === key ? phaseColor : '#fff',
              color: vibe === key ? '#fff' : '#718096',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {config.label}
          </button>
        ))}
      </div>

    </div>
  );
};

export default AudioPlayer;