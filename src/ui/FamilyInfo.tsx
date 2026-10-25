import { useEffect, useRef } from 'react';
import { FAMILIES, type FamilyId } from '../data/families';
import { MAP_POINTS } from '../data/map';
import { play } from '../audio/sound';
import { Chara, MON, specialOf } from './Chara';
import { useStage } from './Stage';

/** 家紋を丸の中に大きく描く */
export function Crest({ family, size }: { family: FamilyId; size: number }) {
  const c = FAMILIES[family].colors;
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" role="img" aria-label={`${FAMILIES[family].name}の家紋`} style={{ display: 'block' }}>
      <circle r={11.4} fill={c.border} stroke="#fff" strokeWidth={0.8} />
      <path d={MON[family]} fill={c.monFill} transform="scale(1.15)" />
    </svg>
  );
}

/** タイトル画面で大名を押したときの、家紋と配下の武将の紹介 */
export function FamilyInfo({ family, onClose }: { family: FamilyId; onClose: () => void }) {
  const { compact } = useStage();
  const f = FAMILIES[family];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: { label: string; kind: 'G' | 'S'; names: readonly string[] }[] = [
    { label: '金の武将', kind: 'G', names: f.gold },
    { label: '銀の武将', kind: 'S', names: f.silver },
  ];

  return (
    <div className="info-backdrop" onClick={onClose}>
      <div
        className="info-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${f.name}の しょうかい`}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: f.colors.border, width: compact ? 820 : 900, padding: compact ? '20px 28px' : '28px 36px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
          <Crest family={family} size={compact ? 84 : 108} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--brown)' }}>家紋</span>
          <div style={{ background: f.colors.tile, borderRadius: 24, padding: '4px 10px 0' }}>
            <Chara kind="K" family={family} size={compact ? 150 : 180} title={f.lord} />
          </div>
        </div>

        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: compact ? 10 : 14, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <h2 className="display" style={{ margin: 0, fontSize: compact ? 44 : 52, fontWeight: 400, lineHeight: 1.1 }}>
              {f.name}
            </h2>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--muted)' }}>本拠地: {MAP_POINTS[family].place}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="label" style={{ fontSize: 15 }}>大将</span>
            <span style={{ fontSize: compact ? 28 : 30, fontWeight: 800 }}>{f.lord}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label" style={{ fontSize: 15 }}>配下の 武将</span>
            {rows.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ width: 92, fontSize: 15, fontWeight: 800, color: 'var(--brown)' }}>{r.label}</span>
                {r.names.map((n) => (
                  <span
                    key={n}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, height: compact ? 48 : 54, padding: '0 16px 0 4px', borderRadius: 27,
                      fontSize: compact ? 20 : 22, fontWeight: 800, background: f.colors.tile, border: `3px solid ${f.colors.border}`, overflow: 'hidden',
                    }}
                  >
                    <Chara kind={r.kind} family={family} crop="bust" size={compact ? 42 : 48} special={specialOf(n, family)} />
                    {n}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div style={{ background: '#fff7e0', borderRadius: 16, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="label-gold" style={{ fontSize: 15 }}>
              ひっさつわざ「{f.skill.name}」
            </span>
            <span style={{ fontSize: compact ? 17 : 16, fontWeight: 700, lineHeight: 1.5, color: '#4a3b2c' }}>{f.skill.desc}</span>
          </div>
        </div>

        <button
          ref={closeRef}
          className="btn btn-ghost"
          style={{ position: 'absolute', right: 16, top: 16, height: 44, fontSize: 16 }}
          onClick={() => {
            play('tap');
            onClose();
          }}
        >
          とじる ✕
        </button>
      </div>
    </div>
  );
}
