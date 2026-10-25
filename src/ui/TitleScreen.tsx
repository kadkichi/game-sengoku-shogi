import { useCallback, useState } from 'react';
import type { FamilyId } from '../data/families';
import { play } from '../audio/sound';
import { FamilyInfo } from './FamilyInfo';
import { LordCarousel } from './LordCarousel';
import { Scenery } from './Scenery';
import { useStage } from './Stage';

export function TitleScreen({ onStart }: { onStart: () => void }) {
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
        <button
          className="btn btn-primary"
          style={{ width: compact ? 280 : 320, height: compact ? 72 : 84, borderRadius: 42, fontSize: compact ? 36 : 40, letterSpacing: '0.2em', paddingLeft: '0.2em', marginTop: compact ? 6 : 12 }}
          onClick={() => {
            play('tap');
            onStart();
          }}
        >
          あそぶ!
        </button>
      </div>
      <div style={{ position: 'absolute', right: 40, bottom: compact ? 12 : 20, fontSize: 15, fontWeight: 700, color: '#1f3d1a' }}>大将を おすと 家紋と 武将が みられるよ</div>
      {info && <FamilyInfo family={info} onClose={closeInfo} />}
    </div>
  );
}
