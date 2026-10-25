import { FAMILIES, FAMILY_IDS } from '../data/families';
import { play } from '../audio/sound';
import { Chara } from './Chara';
import { Scenery } from './Scenery';

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen screen-sky">
      <Scenery />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.3em', paddingLeft: '0.3em', color: 'var(--blue)' }}>せんごく しょうぎ</div>
        <h1 className="display" style={{ margin: 0, fontSize: 128, lineHeight: 1.05, textShadow: '0 6px 0 #fff' }}>
          戦国将棋
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>すきな大名をえらんで、あいての大将をとろう!</p>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 380, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 72 }}>
        {FAMILY_IDS.map((id, i) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="bob" style={{ animationDelay: `${i * 0.3}s` }}>
              <Chara kind="K" family={id} size={180} title={FAMILIES[id].lord} />
            </div>
            <div style={{ padding: '6px 20px', borderRadius: 20, fontSize: 20, fontWeight: 800, color: '#fff', background: FAMILIES[id].colors.border }}>
              {FAMILIES[id].lord}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 654, display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-primary"
          style={{ width: 320, height: 84, borderRadius: 42, fontSize: 40, letterSpacing: '0.2em', paddingLeft: '0.2em' }}
          onClick={() => {
            play('tap');
            onStart();
          }}
        >
          あそぶ!
        </button>
      </div>
      <div style={{ position: 'absolute', right: 40, bottom: 20, fontSize: 15, fontWeight: 700, color: '#1f3d1a' }}>おなじ たんまつで 2人で あそぶよ</div>
    </div>
  );
}
