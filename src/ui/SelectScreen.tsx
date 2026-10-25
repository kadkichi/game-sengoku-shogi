import { useState } from 'react';
import { FAMILIES, FAMILY_IDS, MODES, type FamilyId } from '../data/families';
import type { Side, Variant } from '../engine/types';
import { play } from '../audio/sound';
import { Chara, specialOf } from './Chara';

interface Props {
  initial: Record<Side, FamilyId>;
  initialVariant: Variant;
  onBack: () => void;
  onStart: (families: Record<Side, FamilyId>, variant: Variant) => void;
}

const SIDES: { side: Side; label: string; sub: string }[] = [
  { side: 'sente', label: '先手', sub: 'さきに うごく' },
  { side: 'gote', label: '後手', sub: 'あとから うごく' },
];

const KIND_LABELS: Record<Variant, { gold: string; silver: string; pawns: string }> = {
  small: { gold: '金の武将 (たて・よこ)', silver: '銀の武将 (ななめ)', pawns: '1人' },
  large: { gold: '金の武将', silver: '銀の武将', pawns: '3人' },
};

export function SelectScreen({ initial, initialVariant, onBack, onStart }: Props) {
  const [picked, setPicked] = useState(initial);
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const labels = KIND_LABELS[variant];
  /** かんたんは 金の武将=gold[0]、銀の武将=gold[1] */
  const roster = (id: FamilyId) => {
    const f = FAMILIES[id];
    return variant === 'small'
      ? { gold: [f.gold[0]], silver: [f.gold[1]] }
      : { gold: [...f.gold], silver: [...f.silver] };
  };

  const pickRandom = (side: Side) => {
    play('select');
    setPicked((cur) => {
      const others = FAMILY_IDS.filter((id) => id !== cur[side]);
      return { ...cur, [side]: others[Math.floor(Math.random() * others.length)] };
    });
  };

  return (
    <div className="screen screen-paper">
      <div style={{ height: 68, flex: '0 0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '2px solid var(--line)' }}>
        <button className="btn btn-ghost" style={{ height: 46, borderRadius: 23, fontSize: 17 }} onClick={onBack}>
          ← もどる
        </button>
        <h1 className="display" style={{ margin: 0, fontSize: 32, letterSpacing: '0.1em' }}>
          大名を えらぼう
        </h1>
        <div style={{ width: 128, fontSize: 13, fontWeight: 700, color: 'var(--muted)', textAlign: 'right' }}>おなじ家でも いいよ</div>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', gap: 32, padding: '14px 32px 0' }}>
        {SIDES.map(({ side, label, sub }) => {
          const f = FAMILIES[picked[side]];
          const r = roster(f.id);
          return (
            <section key={side} style={{ width: 592, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label={`${label}の大名`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 14px', borderRadius: 16, fontSize: 17, fontWeight: 800, color: '#fff', background: f.colors.border }}>
                  {label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>{sub}</span>
                <button className="btn btn-ghost" style={{ marginLeft: 'auto', height: 32, fontSize: 13, padding: '0 12px' }} onClick={() => pickRandom(side)}>
                  おまかせ
                </button>
              </div>

              <div role="radiogroup" aria-label={`${label}の大名家`} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {FAMILY_IDS.map((id) => {
                  const on = id === picked[side];
                  const c = FAMILIES[id].colors;
                  return (
                    <button
                      key={id}
                      role="radio"
                      aria-checked={on}
                      className="btn"
                      onClick={() => {
                        play('select');
                        setPicked((cur) => ({ ...cur, [side]: id }));
                      }}
                      style={{
                        height: 64, borderRadius: 16, gap: 4, padding: '0 6px 0 2px', justifyContent: 'flex-start',
                        background: on ? c.tile : '#fff',
                        border: on ? `3px solid ${c.border}` : '2px solid var(--line)',
                        boxShadow: on ? `0 4px 0 ${c.border}` : '0 2px 0 var(--line)',
                        transform: on ? 'translateY(-2px)' : undefined,
                      }}
                    >
                      <Chara kind="K" family={id} crop="bust" size={52} />
                      <span style={{ fontSize: FAMILIES[id].name.length > 3 ? 13 : 16, fontWeight: 800, lineHeight: 1.1, textAlign: 'left' }}>{FAMILIES[id].name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="card" style={{ flex: '1 1 auto', borderRadius: 22, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, borderColor: f.colors.border }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 92, height: 92, flex: '0 0 auto', borderRadius: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.colors.tile, border: `4px solid ${f.colors.border}`, overflow: 'hidden' }}>
                    <Chara kind="K" family={f.id} crop="bust" size={86} title={f.lord} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span className="label">{f.name} の 大将</span>
                    <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{f.lord}</span>
                  </div>
                </div>
                <div style={{ background: '#fff7e0', borderRadius: 14, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span className="label-gold">ひっさつわざ (1かいだけ)</span>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>{f.skill.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: '#4a3b2c' }}>
                    {f.skill.desc}
                    {variant === 'small' && f.skill.smallNote ? ` ※${f.skill.smallNote}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {([[labels.gold, r.gold, 'G'], [labels.silver, r.silver, 'S']] as const).map(([kindLabel, names, kind]) => (
                    <div key={kindLabel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="label" style={{ width: 148 }}>{kindLabel}</span>
                      {names.map((n) => (
                        <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 32, padding: '0 12px 0 2px', borderRadius: 16, fontSize: 15, fontWeight: 800, background: f.colors.tile, border: `2px solid ${f.colors.border}`, overflow: 'hidden' }}>
                          <Chara kind={kind} family={f.id} crop="bust" size={28} special={specialOf(n, f.id)} />
                          {n}
                        </span>
                      ))}
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="label" style={{ width: 148 }}>足軽</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#4a3b2c' }}>{labels.pawns} (名前なし)</span>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div style={{ height: 100, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div role="radiogroup" aria-label="あそびかた" style={{ display: 'flex', gap: 8, padding: 6, borderRadius: 26, background: '#fff', border: '2px solid var(--line)' }}>
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
                  height: 52, padding: '0 18px', borderRadius: 20, flexDirection: 'column', gap: 0, lineHeight: 1.15,
                  background: on ? 'var(--blue)' : 'transparent', color: on ? '#fff' : 'var(--blue)',
                }}
              >
                <span style={{ fontSize: 18 }}>{MODES[v].label}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{MODES[v].size}</span>
              </button>
            );
          })}
        </div>
        <span style={{ width: 210, fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: 'var(--muted)' }}>{MODES[variant].desc}</span>
        <span style={{ fontSize: 19, fontWeight: 800 }}>
          {FAMILIES[picked.sente].name} たい {FAMILIES[picked.gote].name}
        </span>
        <button
          className="btn btn-primary"
          style={{ width: 260, height: 68, borderRadius: 34, fontSize: 30, letterSpacing: '0.15em', paddingLeft: '0.15em' }}
          onClick={() => {
            play('skill');
            onStart(picked, variant);
          }}
        >
          かいせん!
        </button>
      </div>
    </div>
  );
}
