import { useCallback, useState } from 'react';
import type { FamilyId } from '../data/families';
import { play } from '../audio/sound';
import { FamilyInfo } from './FamilyInfo';
import { LordCarousel } from './LordCarousel';
import { Scenery } from './Scenery';
import { useStage } from './Stage';

export type PlayMode = 'solo' | 'duo';

export function TitleScreen({ onStart }: { onStart: (mode: PlayMode) => void }) {
  const { compact } = useStage();
  const [info, setInfo] = useState<FamilyId | null>(null);
  const closeInfo = useCallback(() => setInfo(null), []);
  return (
    <div className="screen screen-sky">
      <Scenery />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? 10 : 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 6 }}>
          <div style={{ fontSize: compact ? 20 : 22, fontWeight: 800, letterSpacing: '0.3em', paddingLeft: '0.3em', color: 'var(--blue)' }}>せんごく しょうぎ</div>
          <h1 className="display" style={{ margin: 0, fontSize: compact ? 92 : 128, lineHeight: 1.05, textShadow: '0 6px 0 #fff' }}>
            戦国将棋
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: compact ? 20 : 22, fontWeight: 700, color: 'var(--blue)' }}>すきな大名をえらんで、あいての大将をとろう!</p>
        </div>
        <div style={{ marginTop: compact ? 0 : 16 }}>
          <LordCarousel onSelect={setInfo} stopped={info !== null} />
        </div>
        <div style={{ display: 'flex', gap: compact ? 24 : 32, marginTop: compact ? 6 : 12 }}>
          {(
            [
              ['solo', 'ひとりで あそぶ', 'CPUと たたかう'],
              ['duo', 'ふたりで あそぶ', 'おなじ たんまつで'],
            ] as const
          ).map(([mode, label, sub]) => (
            <button
              key={mode}
              className="btn btn-primary"
              style={{
                width: compact ? 300 : 330, height: compact ? 76 : 88, borderRadius: 44, flexDirection: 'column', gap: 2, lineHeight: 1.1,
                background: mode === 'duo' ? '#2e5e8c' : undefined, boxShadow: mode === 'duo' ? '0 6px 0 #1f4468' : undefined,
              }}
              onClick={() => {
                play('tap');
                onStart(mode);
              }}
            >
              <span style={{ fontSize: compact ? 30 : 32, letterSpacing: '0.08em' }}>{label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.9 }}>{sub}</span>
            </button>
          ))}
        </div>
      </div>
      {/* スマホでは画面が低くボタンと重なるので出さない */}
      {!compact && (
        <div style={{ position: 'absolute', right: 40, bottom: 20, fontSize: 15, fontWeight: 700, color: '#1f3d1a' }}>大将を おすと 家紋と 武将が みられるよ</div>
      )}
      {info && <FamilyInfo family={info} onClose={closeInfo} />}
    </div>
  );
}
