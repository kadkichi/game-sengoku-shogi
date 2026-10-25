import { FAMILIES, FAMILY_IDS, type FamilyId } from '../data/families';
import type { Kind } from '../engine/types';
import { Chara, specialOf } from './Chara';
import { Crest } from './FamilyInfo';

/** 開発用: 全キャラの一覧。URL に ?chars をつけると表示する。?chars=sanada のように家を指定すると大きく表示する */
export function CharacterSheet() {
  const only = new URLSearchParams(window.location.search).get('chars') as FamilyId | 'mon' | null;
  if (only === 'mon') {
    // ?chars=mon: 12家の家紋の一覧
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#fff', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, alignContent: 'start' }}>
        {FAMILY_IDS.map((id) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Crest family={id} size={150} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>{FAMILIES[id].name}</span>
          </div>
        ))}
      </div>
    );
  }
  const ids = only && only in FAMILIES ? [only as FamilyId] : FAMILY_IDS;
  const size = ids.length === 1 ? 220 : 110;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#fff', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: 6, alignItems: 'center' }}>
        {ids.map((id) => {
          const f = FAMILIES[id];
          const cells: { kind: Kind; name: string; mood?: 'happy'; note?: string }[] =
            ids.length === 1
              ? [
                  { kind: 'K', name: f.lord },
                  { kind: 'K', name: f.lord, mood: 'happy' },
                  { kind: 'G', name: f.gold[0] },
                  { kind: 'G', name: f.gold[1] },
                  { kind: 'S', name: f.gold[1], note: 'かんたんの銀' },
                ]
              : [
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
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {c.name}
                  {c.note ? ` (${c.note})` : ''}
                </span>
              </div>
            )),
          ];
        })}
      </div>
    </div>
  );
}
