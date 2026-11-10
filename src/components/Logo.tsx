/** The RoomCraft mark, same paths as the web app's brand.ts. */
const SHAPES = [
  { d: "M14 40 14 22 32 12 32 30Z", fill: "#f4efe6" },
  { d: "M32 30 32 12 50 22 50 40Z", fill: "#d9cfbf" },
  { d: "M32 30 14 40 32 50 50 40Z", fill: "#d4a574" },
  { d: "M38 20.3 45 24.2 45 32.2 38 28.3Z", fill: "#a9c6bb" },
  { d: "M23 37.2 32 32 41 37.2 32 42.4Z", fill: "#c08f5c" },
];

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2f5d50" />
      <g transform="translate(32 31) scale(1.18) translate(-32 -31)">
        {SHAPES.map((s) => (
          <path key={s.d} d={s.d} fill={s.fill} />
        ))}
      </g>
    </svg>
  );
}
