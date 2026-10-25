const INK = '#3A1F14';

/** 砂埃 (いくつかの丸い煙と、飛び散る小石) */
function Dust() {
  const puffs: [number, number, number][] = [
    [-34, 6, 16], [-18, -10, 14], [0, 10, 18], [20, -8, 15], [36, 6, 16], [-24, 18, 12], [24, 18, 12], [0, -16, 11],
  ];
  const pebbles: [number, number][] = [[-46, -12], [48, -14], [-40, 26], [44, 26]];
  return (
    <g className="dust">
      {puffs.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#EAD9B4" stroke="#B79B6B" strokeWidth={1.5} />
      ))}
      {pebbles.map(([x, y], i) => (
        <circle key={`p${i}`} cx={x} cy={y} r={4} fill="#D9C08E" />
      ))}
    </g>
  );
}

function Katana({ deg }: { deg: number }) {
  return (
    <g transform={`rotate(${deg})`}>
      <path d="M-3 -44 Q0 -56 3 -44 L3 14 L-3 14 Z" fill="#E6ECF2" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <ellipse cx={0} cy={16} rx={9} ry={3.2} fill="#F5C033" stroke={INK} strokeWidth={1.5} />
      <rect x={-3.4} y={18} width={6.8} height={18} rx={2} fill="#2B1A12" />
    </g>
  );
}

/** 火花 (ぎざぎざの星形) */
function Spark({ size = 1 }: { size?: number }) {
  const points = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((a, i) => {
      const r = (i % 2 ? 12 : 22) * size;
      const rad = (a * Math.PI) / 180;
      return `${(r * Math.sin(rad)).toFixed(1)},${(-r * Math.cos(rad)).toFixed(1)}`;
    })
    .join(' ');
  return <polygon points={points} fill="#FFE066" stroke="#E08A00" strokeWidth={1.5} strokeLinejoin="round" />;
}

/**
 * 駒どうしがぶつかったところの演出。
 * battle = 砂埃 + 交差する刀 + 火花 / shot = 砂埃 + 大きな火花 (鉄砲・弓で撃ったとき)
 */
export function Clash({ x, y, scale, kind }: { x: number; y: number; scale: number; kind: 'battle' | 'shot' }) {
  const size = 150 * scale;
  return (
    <div className={`clash ${kind}`} style={{ left: x, top: y, width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="-75 -75 150 150" style={{ overflow: 'visible' }}>
        <Dust />
        <g className="swords">
          {kind === 'battle' ? (
            <>
              <Spark />
              <Katana deg={-42} />
              <Katana deg={42} />
            </>
          ) : (
            <Spark size={1.6} />
          )}
        </g>
      </svg>
    </div>
  );
}
