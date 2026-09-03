interface TaskCardProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  accent: string;
  lifted?: boolean;
  delay: number;
}

function TaskCard({ x, y, width, height, rotate, accent, lifted, delay }: TaskCardProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <g
        className={lifted ? "board-card board-card--lifted" : "board-card"}
        style={{ "--delay": `${delay}ms` } as React.CSSProperties}
      >
        <rect
          width={width}
          height={height}
          rx="14"
          className={lifted ? "board-card__body board-card__body--lifted" : "board-card__body"}
        />
        <rect x="14" y="16" width={width * 0.4} height="8" rx="4" fill={accent} />
        <rect x="14" y="34" width={width - 28} height="6" rx="3" className="board-card__line" />
        <rect x="14" y="46" width={width * 0.6} height="6" rx="3" className="board-card__line" />
        <circle cx={width - 20} cy={height - 18} r="8" fill={accent} opacity="0.35" />
      </g>
    </g>
  );
}

export function BoardIllustration() {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="board-illustration"
      aria-hidden="true"
    >
      <TaskCard x={16} y={30} width={116} height={78} rotate={-5} accent="var(--card-blue)" delay={0} />
      <TaskCard x={24} y={150} width={104} height={68} rotate={4} accent="var(--card-green)" delay={90} />
      <TaskCard x={296} y={26} width={108} height={70} rotate={6} accent="var(--card-yellow)" delay={180} />
      <TaskCard x={288} y={168} width={104} height={66} rotate={-4} accent="var(--card-blue)" delay={270} />
      <TaskCard
        x={150}
        y={96}
        width={128}
        height={92}
        rotate={-3}
        accent="var(--card-purple)"
        lifted
        delay={380}
      />
    </svg>
  );
}
