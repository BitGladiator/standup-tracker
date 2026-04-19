import { useState } from 'react';

const CELL_SIZE = 11;
const CELL_GAP = 2;
const WEEKS = 53;
const DAYS_PER_WEEK = 7;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['','Mon','','Wed','','Fri',''];

const getColor = (total, max) => {
  if (total === 0) return '#ebedf0';
  const intensity = total / max;
  if (intensity < 0.15) return '#c6e1f3';
  if (intensity < 0.35) return '#79b8ff';
  if (intensity < 0.6)  return '#388bfd';
  if (intensity < 0.8)  return '#1f6feb';
  return '#0d419d';
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const ContributionHeatmap = ({ data }) => {
  const [tooltip, setTooltip] = useState(null);

  if (!data) return null;

  const { days, stats } = data;


  const firstDay = new Date(days[0].date);
  const startPad = firstDay.getDay();
  const paddedDays = [
    ...Array(startPad).fill(null),
    ...days,
  ];


  const weeks = [];
  for (let i = 0; i < WEEKS; i++) {
    weeks.push(paddedDays.slice(i * 7, i * 7 + 7));
  }


  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d !== null);
    if (!firstReal) return;
    const month = new Date(firstReal.date).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ month, x: wi });
      lastMonth = month;
    }
  });

  const svgW = WEEKS * (CELL_SIZE + CELL_GAP) + 28;
  const svgH = DAYS_PER_WEEK * (CELL_SIZE + CELL_GAP) + 28;

  return (
    <div>

      {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <MiniStat label="Contributions" value={stats.totalContributions} />
        <MiniStat label="Current streak" value={`${stats.currentStreak}d`} />
        <MiniStat label="Longest streak" value={`${stats.longestStreak}d`} />
        <MiniStat
          label="Best day"
          value={stats.mostActiveDay?.total || 0}
          sub={stats.mostActiveDay ? new Date(stats.mostActiveDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
        />
      </div> */}


      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        overflowX: 'auto',
        position: 'relative',
      }}>
        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: 'block', minWidth: '600px' }}
        >
          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            <text
              key={i}
              x={0}
              y={24 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
              fontSize="8"
              fill="#a0aec0"
              dominantBaseline="middle"
            >
              {label}
            </text>
          ))}


          {monthLabels.map(({ month, x }) => (
            <text
              key={`${month}-${x}`}
              x={28 + x * (CELL_SIZE + CELL_GAP)}
              y={10}
              fontSize="9"
              fill="#718096"
            >
              {MONTHS[month]}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day) return null;
              const x = 28 + wi * (CELL_SIZE + CELL_GAP);
              const y = 16 + di * (CELL_SIZE + CELL_GAP);
              const color = getColor(day.total, stats.maxActivity);

              return (
                <rect
                  key={day.date}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx="2"
                  fill={color}
                  style={{ cursor: 'pointer', transition: 'opacity 0.1s' }}
                  onMouseEnter={(e) => {
                    setTooltip({
                      day,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: '#a0aec0', marginRight: '4px' }}>Less</span>
          {['#ebedf0', '#c6e1f3', '#79b8ff', '#388bfd', '#1f6feb', '#0d419d'].map((c) => (
            <div key={c} style={{ width: '10px', height: '10px', background: c, borderRadius: '2px' }} />
          ))}
          <span style={{ fontSize: '10px', color: '#a0aec0', marginLeft: '4px' }}>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          top: tooltip.y - 80,
          left: tooltip.x - 80,
          background: '#1a202c',
          color: '#fff',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: '160px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>
            {formatDate(tooltip.day.date)}
          </div>
          <div style={{ color: '#a0aec0', lineHeight: '1.8' }}>
            <span style={{ color: '#fff' }}>{tooltip.day.total}</span> contributions<br />
            <span style={{ color: '#fff' }}>{tooltip.day.commits}</span> commits<br />
            <span style={{ color: '#fff' }}>{tooltip.day.prs}</span> pull requests<br />
            <span style={{ color: '#fff' }}>{tooltip.day.reviews}</span> reviews
          </div>
        </div>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, sub }) => (
  <div style={{ background: '#F7FAFC', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
    <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a202c' }}>{value}</div>
    {sub && <div style={{ fontSize: '11px', color: '#3182CE', marginTop: '1px' }}>{sub}</div>}
    <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>{label}</div>
  </div>
);

export default ContributionHeatmap;