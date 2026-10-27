/**
 * 大坂の陣の盤で、豊臣方の陣 (奥2段) に置く大坂城のイラスト。
 * 長い石垣の上に、緑青の屋根・白壁・金のしゃちほこの天守と、両端の櫓が建つ。
 * 幅は盤の5マス、高さは2マスぶん (500x200 の比率)。
 * 奥の段は駒で隠れるので、城は 野原の側の段 (はじめは駒のいない段) に収まるように描く。
 * frontSide='bottom' なら下の段 (後手の城)、'top' なら上の段 (先手の城)
 */
export function OsakaCastle({ width, height, theme, frontSide }: { width: number; height: number; theme: 'winter' | 'summer'; frontSide: 'top' | 'bottom' }) {
  const winter = theme === 'winter';
  const ROOF = '#0ea294';
  const ROOF_DARK = '#3c8a7c';
  const WALL = '#f4f5f4';
  const WIN = '#d4d7d6';
  const GOLD = '#f5c400';
  const SNOW = '#ffffff';
  const stones = winter ? ['#8f9396', '#a7abae', '#c3c6c8', '#787c80'] : ['#8a8478', '#a39c8e', '#bdb6a6', '#757064'];
  const stoneFill = `url(#stones-${theme})`;

  /** 石垣の上端の高さ */
  const base = frontSide === 'bottom' ? 176 : 76;
  /** 天守の大きさ (天守の絵は 幅120・高さ110 で描いて、縮める) */
  const s = frontSide === 'bottom' ? 0.78 : 0.68;

  /** 反りのある屋根 (中心 cx、軒の幅 w、軒の高さ y、棟の幅 top、高さ h) */
  const roof = (cx: number, w: number, y: number, top: number, h: number) => (
    <g>
      <path
        d={`M${cx - w / 2} ${y} Q${cx - top / 2 - (w - top) * 0.12} ${y - h * 0.3} ${cx - top / 2} ${y - h} L${cx + top / 2} ${y - h} Q${cx + top / 2 + (w - top) * 0.12} ${y - h * 0.3} ${cx + w / 2} ${y} Z`}
        fill={ROOF}
      />
      <path d={`M${cx - w / 2 - 1} ${y} L${cx + w / 2 + 1} ${y}`} stroke="#9aa3a1" strokeWidth={1.4} strokeLinecap="round" />
      <path d={`M${cx - top / 2} ${y - h} L${cx + top / 2} ${y - h}`} stroke={ROOF_DARK} strokeWidth={2} />
      {winter && (
        <path
          d={`M${cx - top / 2 - (w - top) * 0.18} ${y - h * 0.55} Q${cx - top / 2} ${y - h * 1.02} ${cx} ${y - h * 1.02} Q${cx + top / 2} ${y - h * 1.02} ${cx + top / 2 + (w - top) * 0.18} ${y - h * 0.55}`}
          fill="none"
          stroke={SNOW}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      )}
    </g>
  );
  /** 白壁と窓 */
  const wall = (x: number, y: number, w: number, h: number, n: number) => (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={WALL} />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + ((i + 0.5) * w) / n - 2.5} y={y + h * 0.22} width={5} height={h * 0.56} fill={WIN} />
      ))}
    </g>
  );
  /** 破風 (三角の飾り)。金の縁どり */
  const gable = (cx: number, y: number, w: number) => (
    <g>
      <path d={`M${cx - w / 2} ${y} L${cx} ${y - w * 0.4} L${cx + w / 2} ${y} Z`} fill={WALL} stroke={ROOF_DARK} strokeWidth={1.6} />
      <path d={`M${cx - w / 2} ${y} L${cx - w * 0.3} ${y - w * 0.12} L${cx - w * 0.18} ${y} Z M${cx + w / 2} ${y} L${cx + w * 0.3} ${y - w * 0.12} L${cx + w * 0.18} ${y} Z`} fill={GOLD} />
      <rect x={cx - 1.5} y={y - w * 0.4 - 3} width={3} height={4} fill={GOLD} />
    </g>
  );
  /** しゃちほこ */
  const shachi = (x: number, y: number, dir: 1 | -1) => (
    <path d={`M${x} ${y} q${3 * dir} -2 ${2.4 * dir} -7 q${-0.6 * dir} -2.4 ${2.6 * dir} -3.4 q${-5 * dir} 0.6 ${-5 * dir} 5.6 q0 3 ${-2.4 * dir} 4.8 Z`} fill={GOLD} />
  );

  /** 天守 (幅120・高さ110、下端 y=110 が石垣の上) */
  const keep = (
    <g>
      <path d="M16 110 L104 110 L97 94 L23 94 Z" fill={stoneFill} stroke={stones[3]} strokeWidth={1} />
      {wall(25, 82, 70, 12, 6)}
      {roof(60, 112, 84, 74, 12)}
      {gable(40, 79, 22)}
      {gable(80, 79, 22)}
      {wall(32, 61, 56, 11, 5)}
      {roof(60, 94, 63, 56, 11)}
      {gable(60, 58, 30)}
      {wall(38, 42, 44, 10, 4)}
      {roof(60, 76, 45, 46, 10)}
      <rect x={43} y={25} width={34} height={10} fill="#8f9694" />
      <path d="M43 28 L77 28 M49 25 L49 35 M55 25 L55 35 M61 25 L61 35 M67 25 L67 35 M73 25 L73 35" stroke="#c9cfcd" strokeWidth={1} />
      {roof(60, 66, 26, 38, 11)}
      {shachi(44, 15, 1)}
      {shachi(76, 15, -1)}
    </g>
  );
  /** 両端の櫓 (幅60・高さ36、下端 y=36 が石垣の上) */
  const turret = (
    <g>
      {wall(12, 24, 36, 12, 3)}
      {roof(30, 58, 25, 30, 9)}
      {wall(18, 10, 24, 8, 2)}
      {roof(30, 40, 11, 22, 8)}
    </g>
  );

  return (
    <svg width={width} height={height} viewBox="0 0 500 200" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <pattern id={`stones-${theme}`} width="24" height="14" patternUnits="userSpaceOnUse">
          <rect width="24" height="14" fill={stones[1]} />
          <path d="M0 0 L6 0 L9 4.7 L6 9.4 L0 9.4 Z" fill={stones[0]} />
          <path d="M9 4.7 L18 4.7 L21 9.4 L18 14 L9 14 L6 9.4 Z" fill={stones[2]} />
          <path d="M12 0 L21 0 L24 4.7 L18 4.7 L9 4.7 Z" fill={stones[3]} opacity={0.7} />
        </pattern>
      </defs>
      {/* 空と、城の内側の地面 */}
      <rect width="500" height="200" fill={winter ? '#e3eef5' : '#f4ead2'} />
      {frontSide === 'top' && <rect y={100} width="500" height="100" fill={winter ? '#d9dfe3' : '#e6d9b8'} />}
      {/* 長い石垣 */}
      <path d={`M6 ${base} L494 ${base} L500 ${base + 24} L0 ${base + 24} Z`} fill={stoneFill} />
      <path d={`M6 ${base} L494 ${base}`} stroke={stones[3]} strokeWidth={1.5} />
      {winter && <path d={`M6 ${base} L494 ${base}`} stroke={SNOW} strokeWidth={3} strokeLinecap="round" />}
      {/* 両端の櫓と、まんなかの天守 */}
      {[60, 440].map((cx) => (
        <g key={cx} transform={`translate(${cx - 30 * s * 1.4} ${base - 36 * s * 1.4}) scale(${s * 1.4})`}>
          {turret}
        </g>
      ))}
      <g transform={`translate(${250 - 60 * s} ${base - 110 * s}) scale(${s})`}>{keep}</g>
    </svg>
  );
}
