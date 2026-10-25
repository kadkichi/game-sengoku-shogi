import { FAMILIES, FAMILY_IDS, type FamilyId } from '../data/families';
import type { Kind } from '../engine/types';
import { Chara, specialOf } from './Chara';

/** 開発用: 全キャラの一覧。URL に ?chars をつけると表示する。?chars=sanada のように家を指定すると大きく表示する */
export function CharacterSheet() {
  const only = new URLSearchParams(window.location.search).get('chars') as FamilyId | null;
  const ids = only && only in FAMILIES ? [only] : FAMILY_IDS;
  const size = ids.length === 1 ? 220 : 110;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#fff', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: 6, alignItems: 'center' }}>
        {ids.map((id) => {
          const f = FAMILIES[id];
          const cells: { kind: Kind; name: string; mood?: 'happy' }[] = [
            { kind: 'K', name: f.lord },
            { kind: 'K', name: f.lord, mood: 'happy' },
            { kind: 'G', name: f.gold[0] },
            { kind: 'S', name: f.silver[0] },
            { kind: 'P', name: '足軽' },
          ];
          return [
            <div key={`${id}-name`} style={{ fontWeight: 800, fontSize: 18 }}>
              {f.name}
            </div>,
            ...cells.map((c, i) => (
              <div key={`${id}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: f.colors.tile, borderRadius: 12 }}>
                <Chara kind={c.kind} family={id} size={size} mood={c.mood} special={specialOf(c.name, id)} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
              </div>
            )),
          ];
        })}
      </div>
    </div>
  );
}
