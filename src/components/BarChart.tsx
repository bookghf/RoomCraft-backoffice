/** Daily bars with a few axis labels. Pure SVG, so it renders on the server. */
export default function BarChart({ data, label }: { data: { date: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 720, H = 180, padL = 28, padB = 22, padT = 8;
  const bw = (W - padL) / Math.max(1, data.length);
  const ticks = [0, Math.ceil(max / 2), max];
  const every = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {ticks.map((t) => {
        const y = H - padB - ((H - padB - padT) * t) / max;
        return (
          <g key={t}>
            <line x1={padL} x2={W} y1={y} y2={y} stroke="#e5e0d8" strokeDasharray={t ? "3 3" : undefined} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b655c">{t}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = ((H - padB - padT) * d.value) / max;
        const x = padL + i * bw;
        return (
          <g key={d.date}>
            <rect x={x + bw * 0.15} y={H - padB - h} width={bw * 0.7} height={Math.max(h, d.value ? 2 : 0)} rx={2} fill="#2f5d50">
              <title>{`${d.date}: ${d.value}`}</title>
            </rect>
            {i % every === 0 && (
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b655c">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
