import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getScoreTrend } from "../api/client.js";

const gradeColor = (score) => {
  if (score >= 85) return "#48BB78";
  if (score >= 70) return "#ECC94B";
  if (score >= 50) return "#ED8936";
  return "#FC8181";
};

const ScoreTrend = () => {
  const navigate = useNavigate();
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScoreTrend()
      .then(setTrend)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div style={{ padding: "40px", color: "#718096" }}>Loading...</div>;

  const W = 640;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 };

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xStep = trend.length > 1 ? chartW / (trend.length - 1) : chartW;

  const toX = (i) => PAD.left + i * xStep;
  const toY = (score) => PAD.top + chartH - (score / 100) * chartH;

  const polyline = trend
    .map((d, i) => `${toX(i)},${toY(d.overall_score)}`)
    .join(" ");

  const avgScore = trend.length
    ? Math.round(
        trend.reduce((s, d) => s + parseInt(d.overall_score), 0) / trend.length
      )
    : 0;

  const bestScore = trend.length
    ? Math.max(...trend.map((d) => parseInt(d.overall_score)))
    : 0;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>
      <button
        onClick={() => navigate("/standup")}
        style={{
          background: "none",
          border: "none",
          color: "#718096",
          cursor: "pointer",
          fontSize: "13px",
          padding: 0,
          marginBottom: "8px",
        }}
      >
        ← Back to standup
      </button>
      <h1
        style={{
          fontSize: "22px",
          fontWeight: "600",
          color: "#1a202c",
          margin: "0 0 32px",
        }}
      >
        Standup quality trend
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <StatCard label="Standups scored" value={trend.length} />
        <StatCard label="Average score" value={avgScore} />
        <StatCard label="Best score" value={bestScore} />
      </div>

      {trend.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "#a0aec0",
            fontSize: "14px",
          }}
        >
          No scored standups yet. Save a standup to get your first score.
        </div>
      ) : (
        <>
          <div
            style={{
              background: "#F7FAFC",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "28px",
            }}
          >
            <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
              {[25, 50, 75, 100].map((y) => (
                <g key={y}>
                  <line
                    x1={PAD.left}
                    y1={toY(y)}
                    x2={W - PAD.right}
                    y2={toY(y)}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={PAD.left - 8}
                    y={toY(y) + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#a0aec0"
                  >
                    {y}
                  </text>
                </g>
              ))}

              <polyline
                points={polyline}
                fill="none"
                stroke="#3182CE"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {trend.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={toX(i)}
                    cy={toY(d.overall_score)}
                    r="5"
                    fill={gradeColor(parseInt(d.overall_score))}
                    stroke="#fff"
                    strokeWidth="2"
                  />

                  <text
                    x={toX(i)}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#a0aec0"
                  >
                    {new Date(d.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px 80px 80px 80px",
                padding: "10px 16px",
                background: "#F7FAFC",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              {[
                "Date",
                "Overall",
                "Clarity",
                "Specific",
                "Blockers",
                "Complete",
              ].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#718096",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            {trend
              .slice()
              .reverse()
              .map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 80px 80px 80px 80px",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f7fafc",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#2d3748" }}>
                    {new Date(d.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: gradeColor(parseInt(d.overall_score)),
                    }}
                  >
                    {d.overall_score}
                  </span>
                  <span style={{ fontSize: "13px", color: "#4a5568" }}>
                    {d.clarity_score}/25
                  </span>
                  <span style={{ fontSize: "13px", color: "#4a5568" }}>
                    {d.specificity_score}/25
                  </span>
                  <span style={{ fontSize: "13px", color: "#4a5568" }}>
                    {d.blocker_quality_score}/25
                  </span>
                  <span style={{ fontSize: "13px", color: "#4a5568" }}>
                    {d.completeness_score}/25
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div
    style={{
      background: "#F7FAFC",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      padding: "16px",
    }}
  >
    <div
      style={{
        fontSize: "20px",
        fontWeight: "600",
        color: "#1a202c",
        marginBottom: "4px",
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: "12px", color: "#718096" }}>{label}</div>
  </div>
);

export default ScoreTrend;
