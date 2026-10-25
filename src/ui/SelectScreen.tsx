import { useState } from 'react';
import { FAMILIES, FAMILY_IDS, MODES, type FamilyId } from '../data/families';
import { ISLANDS, MAP_H, MAP_POINTS, MAP_W } from '../data/map';
import type { Side, Variant } from '../engine/types';
import { play } from '../audio/sound';
import { Chara } from './Chara';
import { useStage } from './Stage';
import { LEVEL_LABEL, type CpuLevel, type CpuSetting } from '../ai/cpu';

interface Props {
  initial: Record<Side, FamilyId>;
  initialVariant: Variant;
  initialCpu: CpuSetting | null;
  /** ひとりで (CPU と) 遊ぶとき true。CPU の強さは「かいせん!」のあとに選ぶ */
  solo: boolean;
  onBack: () => void;
  onStart: (families: Record<Side, FamilyId>, variant: Variant, cpu: CpuSetting | null) => void;
}

const other = (s: Side): Side => (s === 'sente' ? 'gote' : 'sente');

const SIDE_NAME: Record<Side, string> = { sente: '先手', gote: '後手' };
const SIDE_SUB: Record<Side, string> = { sente: 'さきに うごく', gote: 'あとから うごく' };
const SIDE_COLOR: Record<Side, string> = { sente: '#D0392E', gote: '#2E5E8C' };

/** スマホでは顔アイコンを大きくするので、地図の上下の端で切れないよう内側に寄せる */
const iconPos = (id: FamilyId, compact: boolean): [number, number] => {
  const [x, y] = MAP_POINTS[id].icon;
  return compact ? [x, Math.max(125, Math.min(y, 585))] : [x, y];
};

export function SelectScreen({ initial, initialVariant, initialCpu, solo, onBack, onStart }: Props) {
  const [picked, setPicked] = useState(initial);
  const [variant, setVariant] = useState<Variant>(initialVariant);
  /** いま地図で選んでいる側 */
  const [active, setActive] = useState<Side>('sente');
  /** CPU と遊ぶとき、自分が指す側 */
  const [humanSide, setHumanSide] = useState<Side>(initialCpu ? other(initialCpu.side) : 'sente');
  /** 「かいせん!」のあとに出す、CPU の強さを選ぶ窓 */
  const [askLevel, setAskLevel] = useState(false);
  const cpu: { side: Side } | null = solo ? { side: other(humanSide) } : null;
  /** 「先手」「後手」に、CPU と遊ぶときは「あなた」「CPU」を添える */
  const who = (s: Side) => (cpu ? (cpu.side === s ? 'CPU' : 'あなた') : null);
  const { compact, h } = useStage();
  const topH = compact ? 56 : 68;
  const pad = compact ? 12 : 16;
  /** 地図は画面の高さに収まるよう縮める (ふつうの画面では等倍) */
  const mapScale = (h - topH - pad * 2) / MAP_H;
  /** スマホでは顔アイコンを大きくして押しやすくする */
  const chipScale = compact ? 1.3 : 1;
  const lines = FAMILY_IDS.map((id) => {
    const [hx, hy] = MAP_POINTS[id].home;
    const [ix, iy] = iconPos(id, compact);
    return `M${hx} ${hy} L${ix} ${iy}`;
  }).join(' ');

  const pick = (id: FamilyId) => {
    play('select');
    setPicked((cur) => ({ ...cur, [active]: id }));
    // 先手を選んだら、続けて後手を選ぶ
    if (active === 'sente') setActive('gote');
  };

  const pickRandom = () => {
    play('select');
    setPicked((cur) => {
      const others = FAMILY_IDS.filter((id) => id !== cur[active]);
      return { ...cur, [active]: others[Math.floor(Math.random() * others.length)] };
    });
  };

  return (
    <div className="screen screen-paper">
      <div style={{ height: topH, flex: '0 0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '2px solid var(--line)' }}>
        <button className="btn btn-ghost" style={{ height: compact ? 42 : 46, borderRadius: 23, fontSize: 17 }} onClick={onBack}>
          ← もどる
        </button>
        <h1 className="display" style={{ margin: 0, fontSize: compact ? 26 : 32, letterSpacing: '0.1em' }}>
          地図から 大名を えらぼう
        </h1>
        <div style={{ width: 128, fontSize: 13, fontWeight: 700, color: 'var(--muted)', textAlign: 'right' }}>おなじ家でも いいよ</div>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', gap: compact ? 16 : 24, padding: pad, minHeight: 0 }}>
        {/* 地図 */}
        <div style={{ position: 'relative', width: MAP_W * mapScale, height: MAP_H * mapScale, flex: '0 0 auto' }}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H, borderRadius: 28, overflow: 'hidden',
            background: '#bfe3f7', border: '3px solid #8cc4e3', transform: `scale(${mapScale})`, transformOrigin: '0 0',
          }}
        >
          <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true" style={{ position: 'absolute', left: -3, top: -3 }}>
            <path
              d="M60 120 q12 -10 24 0 q12 10 24 0 M700 520 q12 -10 24 0 q12 10 24 0 M110 250 q12 -10 24 0 q12 10 24 0 M560 640 q12 -10 24 0 q12 10 24 0 M760 640 q12 -10 24 0 q12 10 24 0 M300 80 q12 -10 24 0 q12 10 24 0"
              fill="none"
              stroke="#fff"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7}
            />
            <g transform="translate(0 9)" fill="#9ccfe8">
              {Object.values(ISLANDS).map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <g fill="#f7e9c6" stroke="#c9a86a" strokeWidth={4} strokeLinejoin="round">
              {Object.values(ISLANDS).map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <path d={lines} fill="none" stroke="#3a1f14" strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round" />
            {FAMILY_IDS.map((id) => {
              const [x, y] = MAP_POINTS[id].home;
              return <circle key={id} cx={x} cy={y} r={7.5} fill={FAMILIES[id].colors.border} stroke="#fff" strokeWidth={3} />;
            })}
          </svg>

          <div
            aria-live="polite"
            style={{
              position: 'absolute', left: 21, top: 17, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 8px 16px',
              borderRadius: 20, background: 'rgba(255,255,255,0.92)', border: '2px solid #8cc4e3',
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 7, background: SIDE_COLOR[active] }} />
            <span style={{ fontSize: compact ? 23 : 17, fontWeight: 800 }}>{who(active) ? `${who(active)} (${SIDE_NAME[active]})` : SIDE_NAME[active]}の 大名を えらんでね</span>
            <button className="btn btn-ghost" style={{ height: compact ? 46 : 34, fontSize: compact ? 19 : 13, padding: '0 14px' }} onClick={pickRandom}>
              おまかせ
            </button>
          </div>

          {FAMILY_IDS.map((id) => {
            const f = FAMILIES[id];
            const { place } = MAP_POINTS[id];
            const icon = iconPos(id, compact);
            const isS = picked.sente === id;
            const isG = picked.gote === id;
            const on = isS || isG;
            const sides = (['sente', 'gote'] as Side[]).filter((s) => picked[s] === id);
            // 選ばれた側の色の太い輪。両方なら 内側=先手、外側=後手
            const border = isS ? SIDE_COLOR.sente : isG ? SIDE_COLOR.gote : f.colors.border;
            const shadow =
              isS && isG
                ? `0 0 0 3px #fff, 0 0 0 9px ${SIDE_COLOR.gote}, 0 6px 0 9px rgba(0,0,0,0.18)`
                : on
                  ? `0 0 0 3px #fff, 0 0 0 7px ${border}, 0 6px 0 7px rgba(0,0,0,0.18)`
                  : '0 3px 0 rgba(0,0,0,0.15)';
            const picked2 = sides.map((s) => SIDE_NAME[s]).join('と');
            return (
              <button
                key={id}
                className={`map-chip${on ? ' picked' : ''}`}
                aria-pressed={on}
                aria-label={`${f.name} (${f.lord}、${place})${on ? ` ${picked2}に えらばれている` : ''}`}
                onClick={() => pick(id)}
                style={{ left: icon[0] - 56, top: icon[1] - 46, zIndex: on ? 3 : 1, ['--chip-scale' as string]: chipScale }}
              >
                <span className="map-face-wrap">
                  {sides.map((s, i) => (
                    <span key={s} className="map-halo" style={{ borderColor: SIDE_COLOR[s], animationDelay: `${i * 0.8}s` }} />
                  ))}
                  <span className="map-face" style={{ background: f.colors.tile, border: `${on ? 6 : 3}px solid ${border}`, boxShadow: shadow }}>
                    <Chara kind="K" family={id} crop="bust" size={58} />
                  </span>
                </span>
                <span className="map-name" style={{ background: f.colors.border, fontSize: f.name.length > 3 ? 12 : 14 }}>
                  {f.name}
                </span>
                {on && (
                  <span className="map-badges">
                    {sides.map((s) => (
                      <span key={s} className="map-badge" style={{ background: SIDE_COLOR[s] }}>
                        {SIDE_NAME[s]}
                        {who(s) === 'CPU' ? ' CPU' : ''}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>

        {/* 右: 選んだ大名 */}
        <aside style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={compact ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 } : { display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['sente', 'gote'] as Side[]).map((side) => {
            const f = FAMILIES[picked[side]];
            const on = active === side;
            const face = compact ? 64 : 76;
            return (
              <button
                key={side}
                className="btn"
                aria-label={`${SIDE_NAME[side]} ${f.name}。押すと ${SIDE_NAME[side]}を えらびなおせる`}
                onClick={() => setActive(side)}
                style={{
                  background: '#fff', borderRadius: 20, padding: compact ? '10px 10px' : '12px 14px', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: compact ? 6 : 8, textAlign: 'left', fontWeight: 400,
                  border: on ? `4px solid ${SIDE_COLOR[side]}` : '2px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: 14, fontSize: 15, fontWeight: 800, color: '#fff', background: SIDE_COLOR[side] }}>
                    {SIDE_NAME[side]}
                  </span>
                  {who(side) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', borderRadius: 13, fontSize: 14, fontWeight: 800, color: SIDE_COLOR[side], border: `2px solid ${SIDE_COLOR[side]}` }}>
                      {who(side)}
                    </span>
                  )}
                  {!compact && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{on ? '地図で えらんでいるよ' : SIDE_SUB[side]}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 14 }}>
                  <span style={{ width: face, height: face, flex: '0 0 auto', borderRadius: face / 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.colors.tile, border: `4px solid ${f.colors.border}` }}>
                    <Chara kind="K" family={f.id} crop="bust" size={face - 6} title={f.lord} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span className="label" style={compact ? { fontSize: 14 } : undefined}>
                      {compact ? f.name : `${f.name} の 大将 (${MAP_POINTS[f.id].place})`}
                    </span>
                    <span style={{ fontSize: compact ? (f.lord.length > 4 ? 18 : 22) : f.lord.length > 4 ? 22 : 26, fontWeight: 800, lineHeight: 1.1 }}>{f.lord}</span>
                  </span>
                </div>
                <span style={{ background: '#fff7e0', borderRadius: 14, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="label-gold" style={compact ? { fontSize: 15 } : undefined}>
                    {compact ? f.skill.name : `ひっさつわざ「${f.skill.name}」`}
                  </span>
                  <span style={{ fontSize: compact ? 14 : 13, fontWeight: 700, lineHeight: 1.45, color: '#4a3b2c' }}>
                    {f.skill.short}
                    {variant === 'small' && f.skill.smallNote ? ` ※${f.skill.smallNote}` : ''}
                  </span>
                </span>
              </button>
            );
          })}
          </div>

          <div role="radiogroup" aria-label="あそびかた" className="segment">
            {(['small', 'large'] as Variant[]).map((v) => {
              const on = v === variant;
              return (
                <button
                  key={v}
                  role="radio"
                  aria-checked={on}
                  className="btn"
                  title={MODES[v].desc}
                  onClick={() => {
                    play('select');
                    setVariant(v);
                  }}
                  style={{
                    flex: '1 1 0', height: compact ? 46 : 44, borderRadius: 20, flexDirection: 'column', gap: 0, lineHeight: 1.15,
                    background: on ? 'var(--blue)' : 'transparent', color: on ? '#fff' : 'var(--blue)',
                  }}
                >
                  <span style={{ fontSize: compact ? 19 : 17 }}>
                    {MODES[v].label} <span style={{ fontSize: 12, fontWeight: 700 }}>{MODES[v].size}</span>
                  </span>
                  {!compact && <span style={{ fontSize: 11, fontWeight: 700 }}>{v === 'small' ? 'すぐ おわる' : 'じっくり たたかう'}</span>}
                </button>
              );
            })}
          </div>

          {cpu && (
            <div role="radiogroup" aria-label="あなたが 指す側" className="segment">
              {(['sente', 'gote'] as Side[]).map((s) => {
                const on = humanSide === s;
                return (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={on}
                    className="btn"
                    onClick={() => {
                      play('select');
                      setHumanSide(s);
                    }}
                    style={{ flex: '1 1 0', height: compact ? 44 : 40, borderRadius: 20, fontSize: compact ? 18 : 16, background: on ? SIDE_COLOR[s] : 'transparent', color: on ? '#fff' : SIDE_COLOR[s] }}
                  >
                    あなたが {SIDE_NAME[s]}
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ marginTop: 'auto', flex: '0 0 auto', height: compact ? 60 : 62, borderRadius: 34, fontSize: compact ? 28 : 30, letterSpacing: '0.15em', paddingLeft: '0.15em' }}
            onClick={() => {
              if (solo) {
                play('tap');
                setAskLevel(true);
                return;
              }
              play('skill');
              onStart(picked, variant, null);
            }}
          >
            かいせん!
          </button>
        </aside>
      </div>
      {askLevel && (
        <LevelPicker
          onCancel={() => setAskLevel(false)}
          onPick={(level) => {
            play('skill');
            onStart(picked, variant, { side: other(humanSide), level });
          }}
        />
      )}
    </div>
  );
}

const LEVELS: { level: CpuLevel; sub: string; color: string; shadow: string }[] = [
  { level: 'weak', sub: 'はじめての人に おすすめ', color: '#3f9b4a', shadow: '#2c6f34' },
  { level: 'normal', sub: 'すこし 先を よんで さしてくる', color: '#d0392e', shadow: '#9e2a22' },
];

/** 「かいせん!」のあとに、CPU の強さを選ぶ窓 */
function LevelPicker({ onPick, onCancel }: { onPick: (level: CpuLevel) => void; onCancel: () => void }) {
  return (
    <div className="info-backdrop" onClick={onCancel}>
      <div
        className="info-card"
        role="dialog"
        aria-modal="true"
        aria-label="CPUの つよさを えらぶ"
        onClick={(e) => e.stopPropagation()}
        style={{ flexDirection: 'column', gap: 22, padding: '28px 40px 32px', borderColor: '#6b3fa0', width: 640 }}
      >
        <h2 className="display" style={{ margin: 0, fontSize: 34, fontWeight: 400 }}>
          CPUの つよさを えらんでね
        </h2>
        <div style={{ display: 'flex', gap: 24 }}>
          {LEVELS.map((l) => (
            <button
              key={l.level}
              className="btn"
              autoFocus={l.level === 'weak'}
              onClick={() => onPick(l.level)}
              style={{
                width: 260, height: 120, borderRadius: 28, flexDirection: 'column', gap: 6, color: '#fff',
                background: l.color, boxShadow: `0 6px 0 ${l.shadow}`,
              }}
            >
              <span style={{ fontSize: 40, lineHeight: 1 }}>{LEVEL_LABEL[l.level]}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{l.sub}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={onCancel}>
          もどる
        </button>
      </div>
    </div>
  );
}
