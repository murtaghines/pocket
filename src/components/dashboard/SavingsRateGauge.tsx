interface SavingsRateGaugeProps {
  currentRate: number;
  previousRate: number;
  hasPrevious: boolean;
}

const clampRate = (value: number) => Math.max(0, Math.min(100, value));

const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 90;
const STROKE_WIDTH = 22;

const start = { x: 14, y: 74 };
const control = { x: VIEWBOX_WIDTH / 2, y: 4 };
const end = { x: VIEWBOX_WIDTH - 14, y: 74 };

const gaugePath = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;

const pointAt = (pct: number) => {
  const t = clampRate(pct) / 100;
  const inverse = 1 - t;

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * t * control.x +
      t * t * end.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * t * control.y +
      t * t * end.y,
  };
};

export function SavingsRateGauge({
  currentRate,
  previousRate,
  hasPrevious,
}: SavingsRateGaugeProps) {
  const currentClamped = clampRate(currentRate);
  const previousClamped = clampRate(previousRate);
  const segmentStart = Math.min(previousClamped, currentClamped);
  const segmentLength = Math.abs(currentClamped - previousClamped);

  const previousPoint = pointAt(previousClamped);
  const currentPoint = pointAt(currentClamped);

  return (
    <div className="-mx-2 -mb-2 md:-mx-3 md:-mb-3">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="block h-auto w-full"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <pattern
            id="savings-rate-gauge-stripes"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="hsl(var(--muted-foreground) / 0.42)"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>

        <path
          d={gaugePath}
          pathLength={100}
          fill="none"
          stroke="url(#savings-rate-gauge-stripes)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {hasPrevious && previousClamped > 0 && (
          <path
            d={gaugePath}
            pathLength={100}
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.56)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${previousClamped} 100`}
          />
        )}

        {!hasPrevious && currentClamped > 0 && (
          <path
            d={gaugePath}
            pathLength={100}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${currentClamped} 100`}
          />
        )}

        {hasPrevious && segmentLength > 0 && (
          <path
            d={gaugePath}
            pathLength={100}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${segmentLength} 100`}
            strokeDashoffset={-segmentStart}
          />
        )}

        {hasPrevious && (
          <>
            <circle
              cx={previousPoint.x}
              cy={previousPoint.y}
              r="16"
              fill="hsl(var(--muted-foreground) / 0.88)"
            />
            <circle
              cx={previousPoint.x}
              cy={previousPoint.y}
              r="7"
              fill="hsl(var(--card))"
            />
          </>
        )}

        {(currentClamped > 0 || !hasPrevious) && (
          <>
            <line
              x1={currentPoint.x}
              y1={currentPoint.y + 16}
              x2={currentPoint.x}
              y2={VIEWBOX_HEIGHT}
              stroke="hsl(var(--primary) / 0.22)"
              strokeWidth="2"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="22"
              fill="hsl(var(--primary) / 0.16)"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="16"
              fill="hsl(var(--primary))"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="7"
              fill="hsl(var(--card))"
            />
          </>
        )}
      </svg>
    </div>
  );
}