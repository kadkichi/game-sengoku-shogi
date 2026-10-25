import { FAMILIES } from '../data/families';
import { play } from '../audio/sound';
import { Chara } from './Chara';
import { Scenery } from './Scenery';
import { useStage } from './Stage';

/** タイトルに並べる大名 */
const LORDS = ['oda', 'takeda', 'uesugi'] as const;

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const { compact } = useStage();
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: compact ? 48 : 72, marginTop: compact ? 4 : 24 }}>
          {LORDS.map((id, i) => (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="bob" style={{ animationDelay: `${i * 0.3}s` }}>
                <Chara kind="K" family={id} size={compact ? 120 : 180} title={FAMILIES[id].lord} />
              </div>
              <div style={{ padding: '6px 20px', borderRadius: 20, fontSize: 20, fontWeight: 800, color: '#fff', background: FAMILIES[id].colors.border }}>
                {FAMILIES[id].lord}
              </div>
            </div>
          ))}
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
      <div style={{ position: 'absolute', right: 40, bottom: compact ? 12 : 20, fontSize: 15, fontWeight: 700, color: '#1f3d1a' }}>おなじ たんまつで 2人で あそぶよ</div>
    </div>
  );
}
