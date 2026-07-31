interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
  size?: number;
}

/**
 * Plain SVG doughnut chart (stroke-dasharray segments on a circle) — no
 * charting library dependency for what's otherwise a 4-slice breakdown.
 */
const DoughnutChart = ({ data, size = 180 }: Props) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 24;
  let offset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 80 80)">
          {total === 0 ? (
            <circle cx={80} cy={80} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
          ) : (
            data.map((slice) => {
              if (slice.value === 0) return null;
              const sliceLength = (slice.value / total) * circumference;
              const dasharray = `${sliceLength} ${circumference - sliceLength}`;
              const circle = (
                <circle
                  key={slice.label}
                  cx={80}
                  cy={80}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dasharray}
                  strokeDashoffset={-offset}
                />
              );
              offset += sliceLength;
              return circle;
            })
          )}
        </g>
        <text x={80} y={75} textAnchor="middle" fontSize="22" fontWeight={700} fill="var(--text-primary)">
          {total}
        </text>
        <text x={80} y={95} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
          Total
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {data.map((slice) => (
          <div key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ width: '0.7rem', height: '0.7rem', borderRadius: '50%', background: slice.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{slice.label}</span>
            <strong>{slice.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoughnutChart;
